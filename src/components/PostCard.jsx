import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  IconButton,
  Button,
  Stack,
  Box,
  Collapse,
  Divider,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import { getBrandedHeadline } from '../utils/brandCopy';
import PulseHeart from './reactbits/PulseHeart';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EmojiPickerControl from './EmojiPickerControl';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postAPI, commentAPI } from '../services/api';
import { formatTimeAgo } from '../utils/formatters';
import ReportDialog from './ReportDialog';
import VerifiedAccountBadge from './VerifiedAccountBadge';
import { isVerifiedAccount } from '../utils/verification';

const PostCard = ({ post, onPostDeleted, onPostUpdated }) => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [commentCount, setCommentCount] = useState(post.commentCount || (post.comments ? post.comments.length : 0));
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  // Edit post state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');
  const [savingEdit, setSavingEdit] = useState(false);

  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Snackbar state
  const [toastMessage, setToastMessage] = useState(null);
  const [toastSeverity, setToastSeverity] = useState('success');

  const author = post.author || {};
  const isAuthor = currentUser && currentUser._id === (typeof author === 'string' ? author : author._id);

  const handleLikeToggle = async (nextLiked, nextCount) => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    const previousLiked = isLiked;
    const previousCount = likeCount;
    setIsLiked(nextLiked);
    setLikeCount(nextCount);

    try {
      await postAPI.toggleLike(post._id);
    } catch (err) {
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      console.error('[Like Error]', err.message);
    }
  };

  const handleToggleComments = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);

    if (nextShow && comments.length === 0) {
      try {
        setLoadingComments(true);
        const res = await commentAPI.getPostComments(post._id);
        if (res.data.success) {
          setComments(res.data.comments || []);
        }
      } catch (err) {
        console.error('[Comments Load Error]', err.message);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleAddComment = async (e) => {
    e?.preventDefault();
    if (!newComment.trim()) return;

    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    try {
      setSubmittingComment(true);
      const res = await commentAPI.addComment(post._id, { content: newComment.trim() });
      if (res.data.success) {
        setComments((prev) => [...prev, res.data.comment]);
        setCommentCount((prev) => prev + 1);
        setNewComment('');
        setToastSeverity('success');
        setToastMessage('Comment added.');
      }
    } catch (err) {
      console.error('[Add Comment Error]', err.message);
      setToastSeverity('error');
      setToastMessage(err.message || 'Could not add your comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const res = await commentAPI.deleteComment(commentId);
      if (res.data.success) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
        setCommentCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('[Delete Comment Error]', err.message);
    }
  };

  const startEditingComment = (comment) => {
    setEditingCommentId(comment._id);
    setEditingCommentText(comment.content || '');
  };

  const handleUpdateComment = async (event) => {
    event.preventDefault();
    const content = editingCommentText.trim();
    if (!content || !editingCommentId || savingComment) return;
    try {
      setSavingComment(true);
      const response = await commentAPI.updateComment(editingCommentId, { content });
      if (response.data.success) {
        setComments((existing) => existing.map((comment) => (
          comment._id === editingCommentId ? { ...comment, ...response.data.comment, content } : comment
        )));
        setEditingCommentId(null);
        setEditingCommentText('');
        setToastSeverity('success');
        setToastMessage('Comment updated.');
      }
    } catch (error) {
      setToastSeverity('error');
      setToastMessage(error.message || 'Could not update your comment. Please try again.');
    } finally {
      setSavingComment(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setSavingEdit(true);
      const res = await postAPI.updatePost(post._id, { content: editContent });
      if (res.data.success) {
        setIsEditing(false);
        if (onPostUpdated) onPostUpdated(res.data.post);
        setToastMessage('Post updated successfully.');
      }
    } catch (err) {
      console.error('[Update Post Error]', err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePost = async () => {
    try {
      setDeleting(true);
      const res = await postAPI.deletePost(post._id);
      if (res.data.success) {
        setDeleteConfirmOpen(false);
        if (onPostDeleted) onPostDeleted(post._id);
      }
    } catch (err) {
      console.error('[Delete Post Error]', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/post/${post._id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(postUrl);
      setToastMessage('Link copied to clipboard!');
    }
  };

  // Render text with clickable hashtag highlights
  const renderFormattedContent = (text) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <Typography
            key={i}
            component="span"
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => navigate(`/search?q=${encodeURIComponent(part.substring(1))}`)}
          >
            {part}
          </Typography>
        );
      }
      return part;
    });
  };

  return (
    <>
      <Card sx={{ mb: 2.5, position: 'relative', width: '100%', minWidth: 0, overflow: 'visible' }}>
        {/* Post Header */}
        <CardHeader
          avatar={
            <Avatar
              src={author.profilePicture}
              alt={author.name}
              sx={{ width: 48, height: 48, cursor: 'pointer' }}
              onClick={() => navigate(`/profile/${author._id}`)}
            >
              {author.name ? author.name[0] : 'U'}
            </Avatar>
          }
          action={
            isAuthor || isAuthenticated ? (
              <IconButton
                size="small"
                aria-label="Post options"
                aria-expanded={Boolean(anchorEl)}
                onClick={(event) => setAnchorEl((current) => current ? null : event.currentTarget)}
              >
                <MoreVertRoundedIcon />
              </IconButton>
            ) : null
          }
          title={
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
              onClick={() => navigate(`/profile/${author._id}`)}
            >
              <Stack component="span" direction="row" alignItems="center" gap={0.5} sx={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                <span>{author.name || 'Vuprise member'}</span>
                {isVerifiedAccount(author) && <VerifiedAccountBadge color={author.verificationBadgeColor} size={17} />}
              </Stack>
            </Typography>
          }
          subheader={
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary" noWrap>
                {getBrandedHeadline(author.headline) || author.jobTitle || 'Professional'}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                {formatTimeAgo(post.createdAt)}
              </Typography>
            </Stack>
          }
          sx={{ pb: 1 }}
        />

        <Collapse in={Boolean(anchorEl)} unmountOnExit>
          <Stack
            direction="row"
            useFlexGap
            flexWrap="wrap"
            justifyContent="flex-end"
            spacing={0.5}
            sx={{ px: 1.5, py: 0.75, bgcolor: 'action.hover', borderTop: 1, borderColor: 'divider' }}
          >
            {isAuthor ? <>
              <Button
                size="small"
                startIcon={<EditOutlinedIcon fontSize="small" />}
                onClick={() => {
                  setAnchorEl(null);
                  setIsEditing(true);
                }}
              >
                Edit post
              </Button>
              <Button
                size="small"
                color="error"
                startIcon={<DeleteOutlineRoundedIcon fontSize="small" />}
                onClick={() => {
                  setAnchorEl(null);
                  setDeleteConfirmOpen(true);
                }}
              >
                Delete post
              </Button>
            </> : <Button
              size="small"
              color="warning"
              onClick={() => { setAnchorEl(null); setReportOpen(true); }}
            >
              Report post
            </Button>}
          </Stack>
        </Collapse>

        {/* Post Content */}
        <CardContent sx={{ pt: 1, pb: 1.5 }}>
          {isEditing ? (
            <Box sx={{ mb: 2 }}>
              <TextField
                multiline
                rows={3}
                fullWidth
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                variant="outlined"
                sx={{ mb: 1.5 }}
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" variant="outlined" color="inherit" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.65, minWidth: 0, overflowWrap: 'anywhere' }}>
              {renderFormattedContent(post.content)}
            </Typography>
          )}

          {/* Post Image Visual */}
          {post.image && (
            <Box
              sx={{
                mt: 2,
                borderRadius: 2.5,
                overflow: 'hidden',
                bgcolor: 'background.subtle',
                cursor: 'pointer',
                maxHeight: 480,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: (theme) => `1px solid ${theme.palette.divider}`,
              }}
              onClick={() => setImageModalOpen(true)}
            >
              <Box
                component="img"
                src={post.image}
                alt="Post visual attachment"
                sx={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: 480,
                  objectFit: 'cover',
                  transition: 'transform 0.25s ease',
                  '&:hover': { transform: 'scale(1.01)' }
                }}
              />
            </Box>
          )}

          {post.mediaType === 'video' && post.videoUrl && (
            <Box sx={{ mt: 2, borderRadius: 2.5, overflow: 'hidden', bgcolor: 'background.default', border: (theme) => `1px solid ${theme.palette.divider}` }}>
              <Box component="video" src={post.videoUrl} poster={post.videoThumbnail || undefined} controls playsInline preload="metadata" sx={{ display: 'block', width: '100%', maxHeight: 520 }} />
            </Box>
          )}
        </CardContent>

        {/* Counts Bar */}
        {(likeCount > 0 || commentCount > 0) && (
          <Box sx={{ px: 2.5, py: 0.75 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {likeCount > 0 && `❤️ ${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                onClick={handleToggleComments}
              >
                {commentCount > 0 && `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`}
              </Typography>
            </Stack>
          </Box>
        )}

        <Divider />

        {/* Action Buttons */}
        <CardActions sx={{ px: 1, py: 0.5, justifyContent: 'space-around' }}>
          <PulseHeart
            liked={isLiked}
            count={likeCount}
            onChange={handleLikeToggle}
            showCount={false}
            size={20}
            corner={12}
            likedColor="#E11D48"
            idleColor="currentColor"
            pillColor="transparent"
            textColor="currentColor"
            label={isAuthenticated ? 'Like' : 'Sign in to like'}
            className="post-like-heart"
          />

          <Button
            size="small"
            startIcon={<ChatBubbleOutlineRoundedIcon />}
            onClick={handleToggleComments}
            sx={{ color: 'text.secondary', fontWeight: 600, flex: 1 }}
          >
            Comment
          </Button>

          <Button
            size="small"
            startIcon={<ShareOutlinedIcon />}
            onClick={handleShare}
            sx={{ color: 'text.secondary', fontWeight: 600, flex: 1 }}
          >
            Share
          </Button>
        </CardActions>

        {/* Expandable Comments Section */}
        {showComments && (
          <Box sx={{ bgcolor: 'action.hover', p: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
            {/* New Comment Input */}
            {isAuthenticated ? (
              <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
                <Avatar
                  src={currentUser?.profilePicture}
                  alt={currentUser?.name}
                  sx={{ width: 36, height: 36 }}
                >
                  {currentUser?.name ? currentUser.name[0] : 'U'}
                </Avatar>
                <Box component="form" onSubmit={handleAddComment} sx={{ flex: 1, minWidth: 0, display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={submittingComment}
                    sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 3 } }}
                  />
                  <EmojiPickerControl
                    disabled={submittingComment}
                    onSelect={(emoji) => setNewComment((comment) => `${comment}${emoji}`)}
                  />
                  <IconButton
                    size="small"
                    color="primary"
                    type="submit"
                    aria-label="Post comment"
                    disabled={!newComment.trim() || submittingComment}
                    sx={{ width: 36, height: 36, flexShrink: 0 }}
                  >
                    {submittingComment ? <CircularProgress size={16} /> : <SendRoundedIcon fontSize="small" />}
                  </IconButton>
                </Box>
              </Stack>
            ) : (
              <Box sx={{ mb: 2 }}>
                <Button size="small" variant="outlined" onClick={() => navigate('/signin')}>
                  Sign in to comment
                </Button>
              </Box>
            )}

            {/* Comments List */}
            {loadingComments ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : comments.length > 0 ? (
              <Stack spacing={1.5}>
                {comments.map((comment) => {
                  const commentAuthor = comment.author || {};
                  const isCommentOwner =
                    currentUser &&
                    (currentUser._id === commentAuthor._id || currentUser._id === author._id);
                  const isCommentAuthor = currentUser && currentUser._id === commentAuthor._id;
                  const isEditingThisComment = editingCommentId === comment._id;

                  return (
                    <Stack key={comment._id} direction="row" spacing={1.5} alignItems="flex-start">
                      <Avatar
                        src={commentAuthor.profilePicture}
                        alt={commentAuthor.name}
                        sx={{ width: 32, height: 32, cursor: 'pointer' }}
                        onClick={() => navigate(`/profile/${commentAuthor._id}`)}
                      >
                        {commentAuthor.name ? commentAuthor.name[0] : 'U'}
                      </Avatar>
                      <Box
                        sx={{
                          flex: 1,
                          p: 1.5,
                          borderRadius: 2.5,
                          bgcolor: 'background.paper',
                          border: (theme) => `1px solid ${theme.palette.divider}`,
                          position: 'relative',
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                            onClick={() => navigate(`/profile/${commentAuthor._id}`)}
                          >
                            {commentAuthor.name || 'User'}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                              {formatTimeAgo(comment.createdAt)}
                            </Typography>
                            {isCommentAuthor && !isEditingThisComment && (
                              <IconButton
                                size="small"
                                aria-label="Edit comment"
                                title="Edit comment"
                                onClick={() => startEditingComment(comment)}
                                sx={{ p: 0.25, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                              >
                                <EditOutlinedIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            )}
                            {isCommentOwner && !isEditingThisComment && (
                              <IconButton
                                size="small"
                                aria-label="Delete comment"
                                title="Delete comment"
                                onClick={() => handleDeleteComment(comment._id)}
                                sx={{ p: 0.25, color: 'error.main', '&:hover': { color: 'error.dark' } }}
                              >
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            )}
                          </Stack>
                        </Stack>
                        {isEditingThisComment ? (
                          <Box component="form" onSubmit={handleUpdateComment} sx={{ mt: 1 }}>
                            <TextField
                              autoFocus
                              fullWidth
                              multiline
                              minRows={1}
                              maxRows={4}
                              size="small"
                              value={editingCommentText}
                              onChange={(event) => setEditingCommentText(event.target.value.slice(0, 1000))}
                              slotProps={{ htmlInput: { maxLength: 1000, 'aria-label': 'Edit comment text' } }}
                              disabled={savingComment}
                            />
                            <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ mt: 0.5 }}>
                              <Button size="small" startIcon={<CloseRoundedIcon />} onClick={() => setEditingCommentId(null)} disabled={savingComment}>Cancel</Button>
                              <Button size="small" type="submit" variant="contained" startIcon={savingComment ? <CircularProgress size={14} color="inherit" /> : <CheckRoundedIcon />} disabled={!editingCommentText.trim() || savingComment}>Save</Button>
                            </Stack>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.875rem', overflowWrap: 'anywhere' }}>
                            {comment.content}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 1 }}>
                No comments yet. Be the first to share your thoughts!
              </Typography>
            )}
          </Box>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Post?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to permanently delete this post? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDeletePost}
            disabled={deleting}
            variant="contained"
            color="error"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Lightbox Modal */}
      <Dialog
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        maxWidth="md"
        PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'hidden' } }}
      >
        <Box
          component="img"
          src={post.image}
          alt="Post full visual"
          sx={{ width: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 2 }}
        />
      </Dialog>

      {/* Toast alert */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={3500}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toastSeverity} sx={{ borderRadius: 2 }}>
          {toastMessage}
        </Alert>
      </Snackbar>
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedPost={post._id}
        subject="Reported post"
        onSubmitted={() => { setToastSeverity('success'); setToastMessage('Report submitted for review.'); }}
      />
    </>
  );
};

export default PostCard;
