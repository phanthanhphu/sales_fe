import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../../../config.js';

export const useUser = () => {
  const storedUser = JSON.parse(localStorage.getItem('user')) || {};
  const [username, setUsername] = useState(storedUser.username || '');
  const [email, setEmail] = useState(storedUser.email || '');
  const [address, setAddress] = useState(storedUser.address || '');
  const [phone, setPhone] = useState(storedUser.phone || '');
  const [role, setRole] = useState(storedUser.role || '');
  const [profileImage, setProfileImage] = useState(storedUser.profileImageUrl || storedUser.avatar || null);
  const [userId, setUserId] = useState(storedUser.id || '');
  const [createdAt, setCreatedAt] = useState(storedUser.createdAt || null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editedUsername, setEditedUsername] = useState(storedUser.username || '');
  const [firstLetter, setFirstLetter] = useState(storedUser.username ? storedUser.username.charAt(0).toUpperCase() : '');

  const loadUserFromStorage = () => {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    setUsername(user.username || '');
    setEmail(user.email || '');
    setAddress(user.address || '');
    setPhone(user.phone || '');
    setRole(user.role || '');
    setProfileImage(user.profileImageUrl || user.avatar || null);
    setUserId(user.id || '');
    setCreatedAt(user.createdAt || null);
    setEditedUsername(user.username || '');
    setFirstLetter(user.username ? user.username.charAt(0).toUpperCase() : '');

    if (user.role) {
      localStorage.setItem('role', user.role);
    }
  };

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  useEffect(() => {
    if (userId && !username) {
      fetchUser(userId);
    }
  }, [userId, username]);

  const fetchUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'GET',
        headers: {
          accept: '*/*',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }

      const data = await response.json();
      const user = data.data || {};
      
      const userData = {
        ...user,
        avatar: user.profileImageUrl || user.avatar
      };
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUsername(user.username || '');
      setEmail(user.email || '');
      setAddress(user.address || '');
      setPhone(user.phone || '');
      setRole(user.role || '');
      setProfileImage(user.profileImageUrl || user.avatar || null);
      setUserId(user.id || '');
      setCreatedAt(user.createdAt || null);
      setEditedUsername(user.username || '');
      setFirstLetter(user.username ? user.username.charAt(0).toUpperCase() : '');
      setError('');

      if (user.role) {
        localStorage.setItem('role', user.role);
      }
    } catch (err) {
      console.error('Fetch user error:', err);
      setError(err.message);
      setSuccess('');
      loadUserFromStorage();
    }
  };

  const handleUpdateUser = (data) => {
    const updatedUser = {
      id: userId,
      ...data,
      avatar: data.profileImageUrl || profileImage,
    };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    setUsername(updatedUser.username);
    setEmail(updatedUser.email);
    setAddress(updatedUser.address);
    setPhone(updatedUser.phone);
    setRole(updatedUser.role);
    setProfileImage(updatedUser.profileImageUrl || updatedUser.avatar);
    setEditedUsername(updatedUser.username);
    setFirstLetter(updatedUser.username ? updatedUser.username.charAt(0).toUpperCase() : '');
    setCreatedAt(updatedUser.createdAt);
    setIsEditing(false);
    setSuccess('Profile updated successfully');
    setError('');

    if (updatedUser.role) {
      localStorage.setItem('role', updatedUser.role);
    }
  };

  const handleUpdatePassword = (data) => {
    setSuccess(data.message || 'Password changed successfully');
    setError('');
  };

  const handleSaveUsername = () => {
    setUsername(editedUsername);
    setFirstLetter(editedUsername ? editedUsername.charAt(0).toUpperCase() : '');
    localStorage.setItem('user', JSON.stringify({ ...storedUser, username: editedUsername }));
    setIsEditing(false);
    setSuccess('Username updated successfully');

    if (storedUser.role) {
      localStorage.setItem('role', storedUser.role);
    }
  };

  return {
    username,
    email,
    address,
    phone,
    role,
    profileImage,
    userId,
    createdAt,
    isEditing,
    error,
    success,
    editedUsername,
    firstLetter,
    setEditedUsername,
    setIsEditing,
    fetchUser,
    handleUpdateUser,
    handleUpdatePassword,
    handleSaveUsername
  };
};