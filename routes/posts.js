const express = require('express')
const router = express.Router()
const PostModel = require('../models/posts')
const CommentModel = require('../models/comments')

const checkLogin = require('../middlewares/check').checkLogin

// POST /posts/create 发表一篇文章
router.post('/create', checkLogin, function (req, res, next) {
  const author = req.session.user._id
  const title = req.fields.title
  const content = req.fields.content

  // 校验参数
  try {
    if (!title.length) {
      throw new Error('请填写标题')
    }
    if (!content.length) {
      throw new Error('请填写内容')
    }
  } catch (e) {
    req.flash('error', e.message)
    return res.redirect('back')
  }

  let post = {
    author: author,
    title: title,
    content: content
  }

  PostModel.create(post)
    .then(function (result) {
      // 此 post 是插入 mongodb 后的值，包含 _id
      // console.log(result)
      // { result: { ok: 1, n: 1 },
      // ops:
      // [ { author: 5c76045a08e43f1d3848829d,
      //     title: '阿桑地方',
      //     content: '短发短发个合适的话',
      //     pv: 0,
      //     _id: 5c762b1d67ad3e29f45b308b } ],
      // insertedCount: 1,
      // insertedIds: { '0': 5c762b1d67ad3e29f45b308b } }
      post = result.ops[0]
      req.flash('success', '发表成功')
      // 发表成功后跳转到该文章页
      res.redirect(`/posts/${post._id}`)
    })
    .catch(next)
})

// GET /posts/create 发表文章页
router.get('/create', checkLogin, function (req, res, next) {
  res.render('create')
})

// GET /posts/:postId 单独一篇的文章页
router.get('/:postId', function (req, res, next) {
  const postId = req.params.postId
  const userId = req.session.user._id

  Promise.all([
    PostModel.getPostById(postId, userId), // 获取文章信息
    // TagModel.getTags(postId),
    CommentModel.getComments(postId), // 获取该文章所有留言
    PostModel.incPv(postId) // pv 加 1
  ])
    .then(function (result) {
      const post = result[0]
      const comments = result[1]
      if (!post) {
        throw new Error('该文章不存在')
      }

      res.render('post', {
        post: post,
        comments: comments
      })
    })
    .catch(next)
})

// GET /posts 所有用户或者特定用户的文章页
//   eg: GET /posts?author=xxx
router.get('/', function (req, res, next) {
  const author = req.query.author
  const pageIndex = (req.query.pageIndex - 0) || 1 // 转化为数字
  const pageSize = 10 // req.query.pageSize
  if (req.session.user) {
    var userId = req.session.user._id
  }

  PostModel.getPosts(author, pageIndex, pageSize, userId)
    .then(function (posts) {
      PostModel.getPostsCount(author)
        .then(function (postsCount) {
          res.render('posts', {
            posts: posts,
            pager: {
              pageIndex: pageIndex,
              pagesCount: Math.ceil(postsCount / pageSize),
              queryStringOfAuthor: (author) ? 'author=' + author + '&' : ''
            }
          })
        })
    })
    .catch(next)
})

// GET /posts/:postId/edit 更新文章页
router.get('/:postId/edit', checkLogin, function (req, res, next) {
  const postId = req.params.postId
  const author = req.session.user._id

  PostModel.getRawPostById(postId)
    .then(function (post) {
      if (!post) {
        throw new Error('该文章不存在')
      }
      if (author.toString() !== post.author._id.toString()) {
        throw new Error('权限不足')
      }
      res.render('edit', {
        post: post
      })
    })
    .catch(next)
})

// POST /posts/:postId/edit 更新一篇文章
router.post('/:postId/edit', checkLogin, function (req, res, next) {
  const postId = req.params.postId
  const author = req.session.user._id
  const title = req.fields.title
  const content = req.fields.content

  // 校验参数
  try {
    if (!title.length) {
      throw new Error('请填写标题')
    }
    if (!content.length) {
      throw new Error('请填写内容')
    }
  } catch (e) {
    req.flash('error', e.message)
    return res.redirect('back')
  }

  // 重新获取文章信息进行更新
  PostModel.getRawPostById(postId)
    .then(function (post) {
      if (!post) {
        throw new Error('文章不存在')
      }
      if (post.author._id.toString() !== author.toString()) {
        throw new Error('没有权限')
      }
      PostModel.updatePostById(postId, { title: title, content: content })
        .then(function () {
          req.flash('success', '编辑文章成功')
          // 编辑成功后跳转到上一页
          res.redirect(`/posts/${postId}`)
        })
        .catch(next)
    })
})

// GET /posts/:postId/remove 删除一篇文章
router.get('/:postId/remove', checkLogin, function (req, res, next) {
  const postId = req.params.postId
  const author = req.session.user._id

  PostModel.getRawPostById(postId)
    .then(function (post) {
      if (!post) {
        throw new Error('文章不存在')
      }
      if (post.author._id.toString() !== author.toString()) {
        throw new Error('没有权限')
      }
      PostModel.delPostById(postId, author)
        .then(function () {
          req.flash('success', '删除文章成功')
          // 删除成功后跳转到主页
          res.redirect('/posts')
        })
        .catch(next)
    })
})

module.exports = router
