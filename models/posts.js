const marked = require('marked')
const Post = require('../lib/mongo').Post
const CommentModel = require('./comments')
const Comment2Model = require('./comment2s')
const TagModel = require('./tags')

// 给 post 添加留言数 commentsCount
Post.plugin('addCommentsCount', {
  afterFind: function (posts) {
    return Promise.all(posts.map(function (post) {
      return CommentModel.getCommentsCount(post._id).then(function (commentsCount) {
        post.commentsCount = commentsCount
        return post
      })
    }))
  },
  afterFindOne: function (post) {
    if (post) {
      return CommentModel.getCommentsCount(post._id).then(function (count) {
        post.commentsCount = count
        return post
      })
    }
    return post
  }
})

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

// 将 post 的 content 从 markdown 转换成 html
Post.plugin('contentToHtml', {
  afterFind: function (posts) {
    return posts.map(function (post) {
      post.content = marked(post.content)
      return post
    })
  },
  afterFindOne: function (post) {
    if (post) {
      post.content = marked(post.content)
    }
    return post
  }
})

// 保留 post 的 content 前5行
Post.plugin('cutContent', {
  afterFind: function (posts) {
    return posts.map(function (post) {
      post.content = post.content.split('\n').slice(0, 4).join('\n')
      return post
    })
  },
  afterFindOne: function (post) {
    if (post) {
      post.content = post.content.split('\n').slice(0, 4).join('\n')
    }
    return post
  }
})

module.exports = {
  // 创建一篇文章
  create: function create (post) {
    return Post.create(post).exec()
  },

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

  // 获取所有用户或某个用户的所有文章数量
  getPostsCount: function getPostsCount (author) {
    const query = {}
    if (author) {
      query.author = author
    }
    return Post
      .count(query)
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

  // 通过文章 id 给 pv 加 1
  incPv: function incPv (postId) {
    return Post
      .update({ _id: postId }, { $inc: { pv: 1 } })
      .exec()
  },

  // 通过文章 id 获取一篇原生文章（编辑文章）
  getRawPostById: function getRawPostById (postId) {
    return Post
      .findOne({ _id: postId })
      .populate({ path: 'author', model: 'User' })
      .exec()
  },

  // 通过文章 id 更新一篇文章
  updatePostById: function updatePostById (postId, data) {
    return Post.update({ _id: postId }, { $set: data }).exec()
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
}
