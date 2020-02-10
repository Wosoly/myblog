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
