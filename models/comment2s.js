const marked = require('marked')
const Comment2 = require('../lib/mongo').Comment2

// 将 comment2 的 content 从 markdown 转换成 html
Comment2.plugin('contentToHtml', {
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
    return Comment2.create(comment).exec()
  },

  // 通过留言 id 获取一个留言
  getCommentById: function getCommentById (commentId) {
    return Comment2.findOne({ _id: commentId }).exec()
  },

  // 通过留言 id 删除一个留言
  delCommentById: function delCommentById (commentId) {
    return Comment2.deleteOne({ _id: commentId }).exec()
  },

  // 通过留言 id 删除该留言下所有留言
  delComment2sByCommentId: function delComment2sByCommentId (commentId) {
    return Comment2.deleteMany({ commentId: commentId }).exec()
  },

  // 通过文章 id 删除该文章下所有二级留言
  delComment2sByPostId: function delComment2sByPostId (postId) {
    return Comment2.deleteMany({ postId: postId }).exec()
  },

  // 通过留言 id 获取该留言下所有留言，按留言创建时间升序
  getComments: function getComments (commentId) {
    return Comment2
      .find({ commentId: commentId })
      .populate({ path: 'author', model: 'User' })
      .sort({ _id: 1 })
      .addCreatedAt()
      .contentToHtml()
      .exec()
  },

  // 通过留言 id 获取该留言下留言数
  getCommentsCount: function getCommentsCount (commentId) {
    return Comment2.count({ commentId: commentId }).exec()
  }
}
