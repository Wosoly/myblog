const marked = require('marked')
const Comment = require('../lib/mongo').Comment
const Comment2Model = require('./comment2s')

// 给 comments 添加 comment2s
Comment.plugin('addComment2s', {
  afterFind: function (comments) {
    return Promise.all(comments.map(function (comment) {
      return Comment2Model.getComments(comment._id).then(function (comment2s) {
        comment.comment2s = comment2s
        return comment
      })
    }))
  },
  afterFindOne: function (comment) {
    if (comment) {
      return Comment2Model.getComments(comment._id).then(function (comment2s) {
        comment.comment2s = comment2s
        return comment
      })
    }
    return comment
  }
})

// 将 comment 的 content 从 markdown 转换成 html
Comment.plugin('contentToHtml', {
  afterFind: function (comments) {
    return comments.map(function (comment) {
      comment.content = marked(comment.content)
      return comment
    })
  }
})

module.exports = {
  // 创建一个留言
  create: function create (comment) {
    return Comment.create(comment).exec()
  },

  // 通过留言 id 获取一个留言
  getCommentById: function getCommentById (commentId) {
    return Comment.findOne({ _id: commentId }).exec()
  },

  // 通过留言 id 删除一个留言
  delCommentById: function delCommentById (commentId) {
    return Comment.deleteOne({ _id: commentId }).exec()
      .then(function (res) {
        // 留言删除后，再删除该留言下的所有二级留言
        if (res.result.ok && res.result.n > 0) {
          return Comment2Model.delComment2sByCommentId(commentId)
        }
      })
  },

  // 通过文章 id 删除该文章下所有留言
  delCommentsByPostId: function delCommentsByPostId (postId) {
    return Comment.deleteMany({ postId: postId }).exec()
  },

  // 通过文章 id 获取该文章下所有留言，按留言创建时间升序
  getComments: function getComments (postId) {
    return Comment
      .find({ postId: postId })
      .populate({ path: 'author', model: 'User' })
      .sort({ _id: 1 })
      .addCreatedAt()
      .addComment2s() // 增加二级留言
      .contentToHtml()
      .exec()
  },

  // 通过文章 id 获取该文章下留言数
  getCommentsCount: function getCommentsCount (postId) {
    return Comment.count({ postId: postId }).exec()
  }
}
