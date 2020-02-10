## 功能

* ~~文章的作者可以给自己的文章添加标签~~
* 用户可以给任何文章添加标签
* 界面上显示用户的标签列表，点击可以跳转到改标签对应的文章

## 模型设计

> 表结构：Tag: tag、post_id、author(user_id)

修改 lib/mongo.js，添加如下代码：

**lib/mongo.js**

```js
// 标签
exports.Tag = mongolass.model('Tag', {
  author: { type: Mongolass.Types.ObjectId, required: true },
  tag: { type: 'string', required: true },
  postId: { type: Mongolass.Types.ObjectId, required: true }
})
exports.Tag.index({ tag: 1, author: 1, postId: 1 }, { unique: true }).exec() // 按标签升序排序，每个用户每个文章标签唯一
```

## 页面设计

* 文章下方增加一行，显示标签列表，包含已添加的标签，可以是多个
* 每个已添加标签右侧有删除按钮，
* 标签列表右侧有文本框，可以输入标签，点击保存添加

修改 views\components\post-content.ejs,增加显示标签列表和输入框的标签组件

**views\components\post-content.ejs**

```html
<div class="post-content">
    <div class="ui grid">
        <div class="four wide column">
        <a class="avatar avatar-link"
            href="/posts?author=<%= post.author._id %>"
            data-title="<%= post.author.name %> | <%= ({m: '男', f: '女', x: '保密'})[post.author.gender] %>"
            data-content="<%= post.author.bio %>">
            <img class="avatar" src="/img/<%= post.author.avatar %>">
        </a>
        </div>

        <div class="eight wide column">
        <div class="ui segment">
            <h3><a href="/posts/<%= post._id %>"><%= post.title %></a></h3>
            <pre><%- post.content %></pre>
            <div>
            <span class="tag"><%= post.created_at %></span>
            <% if (user) { %>
                <% post.tags.forEach(function (tag) { %>
                <span class="tag">
                    🏷️<%- tag.tag %>
                    <% if (tagEditFlag) { %>
                        <a class="delete" href="/tags/<%= tag._id %>/remove">❌</a>
                    <% } %>  
                <% }) %>
                </span>
            <% } %>  
            <span class="tag right">
                <span>浏览(<%= post.pv || 0 %>)</span>
                <span>留言(<%= post.commentsCount || 0 %>)</span>

                <% if (user && post.author._id && user._id.toString() === post.author._id.toString()) { %>
                <div class="ui inline dropdown">
                    <div class="text"></div>
                    <i class="dropdown icon"></i>
                    <div class="menu">
                    <div class="item"><a href="/posts/<%= post._id %>/edit">编辑</a></div>
                    <div class="item"><a href="/posts/<%= post._id %>/remove">删除</a></div>
                    </div>
                </div>
                <% } %>
            </span>
            </div>
            <% if (tagEditFlag) { %>
            <form class="ui tag form" method="post" action="/tags">
                <input name="postId" value="<%= post._id %>" hidden>
                <div class="field">
                <input name="tag" type="text">
                </div>
                <input type="submit" class="ui icon button" value="新增标签" />
            </form>
            <% } %>
        </div>
        </div>
    </div>
</div>
```

修改 views\post.ejs，增加标签编辑标志

**views\post.ejs**

```html
<%- include('header') %>

<%- include('components/post-content', { tagEditFlag :true }) %>
<%- include('components/comments') %>

<%- include('footer') %>
```

修改 views\posts.ejs，同样增加标签编辑标志

**views\posts.ejs**

```html
<%- include('header') %>

<%- include('components/pager') %>

<% posts.forEach(function (post) { %>
    <%- include('components/post-content', { post: post, tagEditFlag :false }) %>
<% }) %>

<%- include('footer') %>
```

## models 设计
新建 models\tags.js

**models\tags.js**
```js
const Tag = require('../lib/mongo').Tag

module.exports = {
  // 创建一个标签
  create: function create (tag) {
    return Tag.create(tag).exec()
  },

  // 通过标签 id 获取一个标签
  getTagById: function getTagById (tagId) {
    return Tag.findOne({ _id: tagId }).exec()
  },

  // 通过标签 id 名称删除标签
  delTagById: function delTagById (tagId) {
    return Tag.deleteOne({ _id: tagId }).exec()
  },

  // 通过文章 id 删除该文章下所有标签
  delTagsByPostId: function delTagsByPostId (postId) {
    return Tag.deleteMany({ postId: postId }).exec()
  },

  // 通过文章 id 获取该文章下所有留言，按标签字母顺序
  getTags: function getTags (postId, userId) {
    return Tag
      .find({ postId: postId, author: userId })
      .populate({ path: 'author', model: 'User' })
      .sort({ Tag: 1 })
      .exec()
  },

  // 通过文章 id 获取该文章下标签数
  getTagsCount: function getTagsCount (postId) {
    return Tag.count({ postId: postId }).exec()
  }
}
```

修改 models\posts.js，获取文章时同时获取文章标签，删除文章时，除删除留言、二级留言外，同时删除标签，新增及修改代码如下
**models\posts.js**
```js
const TagModel = require('./tags')

// 给 post 添加当前作者标签 tags
Post.plugin('addTags', {
  afterFind: function (posts, userId) {
    return Promise.all(posts.map(function (post) {
      return TagModel.getTags(post._id, userId).then(function (tags) {
        post.tags = tags
        return post
      })
    }))
  },
  afterFindOne: function (post, userId) {
    if (post) {
      return TagModel.getTags(post._id, userId).then(function (tags) {
        post.tags = tags
        return post
      })
    }
    return post
  }
})

  // 通过文章 id 获取一篇文章
  getPostById: function getPostById (postId, userId) {
    return Post
      .findOne({ _id: postId })
      .populate({ path: 'author', model: 'User' })
      .addCreatedAt()
      .addTags(userId)
      .addCommentsCount()
      .contentToHtml()
      .exec()
  },

  // 按创建时间降序获取所有用户或者某个特定用户的指定页文章
  getPosts: function getPosts (author, pageIndex, pageSize, userId) {
    const query = {}
    if (author) {
      query.author = author
    }
    return Post
      .find(query)
      .populate({ path: 'author', model: 'User' }) // 读取author对应的User对象
      .sort({ _id: -1 })
      .skip((pageIndex - 1) * pageSize)
      .limit(pageSize)
      .addCreatedAt()
      .addCommentsCount()
      .addTags(userId)
      .cutContent() // 获取文章的前5行
      .contentToHtml()
      .exec()
  },

  // 通过文章 id 删除一篇文章
  delPostById: function delPostById (postId, author) {
    return Post.deleteOne({ author: author, _id: postId })
      .exec()
      .then(function (res) {
        // 文章删除后，再删除该文章下的所有留言、2及留言、标签
        if (res.result.ok && res.result.n > 0) {
          return Promise.all([
            CommentModel.delCommentsByPostId(postId),
            Comment2Model.delComment2sByPostId(postId),
            TagModel.delTagsByPostId(postId)
          ])
        }
      })
  }
```

## 路由设计
新增 routes\tags.js

**routes\tags.js**

```js
const express = require('express')
const router = express.Router()

const checkLogin = require('../middlewares/check').checkLogin
const TagModel = require('../models/tags')

// POST /tag 创建一个标签
router.post('/', checkLogin, function (req, res, next) {
  const author = req.session.user._id
  const postId = req.fields.postId
  const tag = req.fields.tag

  // 校验参数
  try {
    if (!tag.length) {
      throw new Error('请填写标签内容')
    }
  } catch (e) {
    req.flash('error', e.message)
    return res.redirect('back')
  }

  const Tag = {
    author: author,
    postId: postId,
    tag: tag
  }

  TagModel.create(Tag)
    .then(function () {
      req.flash('success', '新建标签成功')
      // 新建标签成功后跳转到上一页
      res.redirect('back')
    })
    .catch(function (e) {
      // 标签重复跳转到上一页
      if (e.message.match('duplicate key')) {
        req.flash('error', '标签已存在')
        return res.redirect('back')
      }
      next(e)
    })
})

// GET /tags/:tagId/remove 删除一个标签
router.get('/:tagId/remove', checkLogin, function (req, res, next) {
  const tagId = req.params.tagId
  const author = req.session.user._id

  TagModel.getTagById(tagId)
    .then(function (tag) {
      if (!tag) {
        throw new Error('标签不存在')
      }
      if (tag.author.toString() !== author.toString()) {
        throw new Error('没有权限删除标签')
      }
      TagModel.delTagById(tagId)
        .then(function () {
          req.flash('success', '删除标签成功')
          // 删除成功后跳转到上一页
          res.redirect('back')
        })
        .catch(next)
    })
})

module.exports = router

```

修改 routes\psots.js，在读取文章时获取文章对应的标签

**routes\psots.js**
```js
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
```

修改 routes\index.js, 路由中加上 tags 路由

**routes\index.js**
```js
  app.use('/tags', require('./tags'))
```