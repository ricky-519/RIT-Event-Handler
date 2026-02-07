import ForumPost from '../models/ForumPost.js';

// Create forum post
export const createForumPost = async (req, res) => {
  try {
    const { eventId, content } = req.body;

    const post = new ForumPost({
      event: eventId,
      author: req.user.userId,
      content,
    });

    await post.save();
    await post.populate('author', 'name email role');

    res.status(201).json({
      message: 'Forum post created successfully',
      post,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get forum posts for event
export const getForumPosts = async (req, res) => {
  try {
    const { eventId } = req.params;

    const posts = await ForumPost.find({ event: eventId })
      .populate('author', 'name email role')
      .populate('comments.author', 'name email')
      .populate('likes', 'name')
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add comment to post
export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    const post = await ForumPost.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({
      author: req.user.userId,
      content,
    });

    await post.save();
    await post.populate('comments.author', 'name email');

    res.json({
      message: 'Comment added successfully',
      post,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Like/Unlike post
export const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await ForumPost.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userLikeIndex = post.likes.indexOf(req.user.userId);

    if (userLikeIndex === -1) {
      post.likes.push(req.user.userId);
    } else {
      post.likes.splice(userLikeIndex, 1);
    }

    await post.save();

    res.json({
      message: userLikeIndex === -1 ? 'Post liked' : 'Post unliked',
      post,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete post
export const deleteForumPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await ForumPost.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await ForumPost.findByIdAndDelete(postId);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
