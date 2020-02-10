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
