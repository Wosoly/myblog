const express = require('express')
const router = express.Router()

const checkLogin = require('../middlewares/check').checkLogin
const Comment2Model = require('../models/comment2s')

// POST /comment2s 创建一条留言
router.post('/', checkLogin, function (req, res, next) {
  const author = req.session.user._id
  const commentId = req.fields.commentId
  const postId = req.fields.postId
  const content = req.fields.content

  // 校验参数
  try {
    if (!content.length) {
      throw new Error('请填写留言内容')
    }
  } catch (e) {
    req.flash('error', e.message)
    return res.redirect('back')
  }

  const comment = {
    author: author,
    commentId: commentId,
    postId: postId,
    content: content
  }

  Comment2Model.create(comment)
    .then(function () {
      req.flash('success', '留言成功')
      // 留言成功后跳转到上一页
      res.redirect('back')
    })
    .catch(next)
})

// GET /comment2s/:commentId/remove 删除一条留言
router.get('/:comment2Id/remove', checkLogin, function (req, res, next) {
  const comment2Id = req.params.comment2Id
  const author = req.session.user._id

  Comment2Model.getCommentById(comment2Id)
    .then(function (comment) {
      if (!comment) {
        throw new Error('留言不存在')
      }
      if (comment.author.toString() !== author.toString()) {
        throw new Error('没有权限删除留言')
      }
      Comment2Model.delCommentById(comment2Id)
        .then(function () {
          req.flash('success', '删除留言成功')
          // 删除成功后跳转到上一页
          res.redirect('back')
        })
        .catch(next)
    })
})

module.exports = router
