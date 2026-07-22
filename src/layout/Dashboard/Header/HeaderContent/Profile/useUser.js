import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../../../config.js';

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}') || {};
  } catch {
    return {};
  }
};

const normalizeDepartment = (user = {}) => {
  const departmentId = user.departmentId || user.department?.id || '';
  const departmentName = user.departmentName || user.department?.departmentName || user.department?.name || '';
  const division = user.division || user.department?.division || '';
  return {
    departmentId,
    departmentName,
    division,
    department: {
      ...(user.department || {}),
      id: departmentId,
      departmentName,
      name: departmentName,
      division
    }
  };
};

export const useUser = () => {
  const storedUser = readStoredUser();
  const initialDepartment = normalizeDepartment(storedUser);
  const [username, setUsername] = useState(storedUser.username || '');
  const [email, setEmail] = useState(storedUser.email || '');
  const [address, setAddress] = useState(storedUser.address || '');
  const [phone, setPhone] = useState(storedUser.phone || '');
  const [role, setRole] = useState(storedUser.role || '');
  const [profileImage, setProfileImage] = useState(storedUser.profileImageUrl || storedUser.avatar || null);
  const [userId, setUserId] = useState(storedUser.id || '');
  const [createdAt, setCreatedAt] = useState(storedUser.createdAt || null);
  const [enabled, setEnabled] = useState(Boolean(storedUser.enabled ?? storedUser.isEnabled ?? true));
  const [accessPermissions, setAccessPermissions] = useState(Array.isArray(storedUser.accessPermissions) ? storedUser.accessPermissions : []);
  const [buyerKeys, setBuyerKeys] = useState(Array.isArray(storedUser.buyerKeys) ? storedUser.buyerKeys : []);
  const [departmentId, setDepartmentId] = useState(initialDepartment.departmentId);
  const [departmentName, setDepartmentName] = useState(initialDepartment.departmentName);
  const [division, setDivision] = useState(initialDepartment.division);
  const [department, setDepartment] = useState(initialDepartment.department);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editedUsername, setEditedUsername] = useState(storedUser.username || '');
  const [firstLetter, setFirstLetter] = useState(storedUser.username ? storedUser.username.charAt(0).toUpperCase() : '');

  const applyUserState = (rawUser = {}) => {
    const user = { ...readStoredUser(), ...rawUser };
    const normalizedDepartment = normalizeDepartment(user);
    const normalizedUser = {
      ...user,
      ...normalizedDepartment,
      avatar: user.profileImageUrl || user.avatar || null,
      enabled: Boolean(user.enabled ?? user.isEnabled ?? true),
      isEnabled: Boolean(user.enabled ?? user.isEnabled ?? true)
    };

    localStorage.setItem('user', JSON.stringify(normalizedUser));
    if (normalizedUser.role) localStorage.setItem('role', normalizedUser.role);
    localStorage.setItem('departmentId', normalizedDepartment.departmentId);
    localStorage.setItem('departmentName', normalizedDepartment.departmentName);
    localStorage.setItem('division', normalizedDepartment.division);

    setUsername(normalizedUser.username || '');
    setEmail(normalizedUser.email || '');
    setAddress(normalizedUser.address || '');
    setPhone(normalizedUser.phone || '');
    setRole(normalizedUser.role || '');
    setProfileImage(normalizedUser.profileImageUrl || normalizedUser.avatar || null);
    setUserId(normalizedUser.id || '');
    setCreatedAt(normalizedUser.createdAt || null);
    setEnabled(normalizedUser.enabled);
    setAccessPermissions(Array.isArray(normalizedUser.accessPermissions) ? normalizedUser.accessPermissions : []);
    setBuyerKeys(Array.isArray(normalizedUser.buyerKeys) ? normalizedUser.buyerKeys : []);
    setDepartmentId(normalizedDepartment.departmentId);
    setDepartmentName(normalizedDepartment.departmentName);
    setDivision(normalizedDepartment.division);
    setDepartment(normalizedDepartment.department);
    setEditedUsername(normalizedUser.username || '');
    setFirstLetter(normalizedUser.username ? normalizedUser.username.charAt(0).toUpperCase() : '');
    return normalizedUser;
  };

  const loadUserFromStorage = () => applyUserState(readStoredUser());

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  useEffect(() => {
    if (userId && !username) fetchUser(userId);
  }, [userId, username]);

  const fetchUser = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        method: 'GET',
        headers: { accept: '*/*', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!response.ok) throw new Error(`Failed to fetch user: ${response.statusText}`);
      const data = await response.json();
      applyUserState(data.data || {});
      setError('');
    } catch (err) {
      console.error('Fetch user error:', err);
      setError(err.message);
      setSuccess('');
      loadUserFromStorage();
    }
  };

  const handleUpdateUser = (data) => {
    const updatedUser = applyUserState({ id: userId, ...data });
    setIsEditing(false);
    setSuccess('Profile updated successfully');
    setError('');
    return updatedUser;
  };

  const handleUpdatePassword = (data) => {
    setSuccess(data.message || 'Password changed successfully');
    setError('');
  };

  const handleSaveUsername = () => {
    applyUserState({ username: editedUsername });
    setIsEditing(false);
    setSuccess('Username updated successfully');
  };

  return {
    username, email, address, phone, role, profileImage, userId, createdAt, enabled,
    accessPermissions, buyerKeys, departmentId, departmentName, division, department,
    isEditing, error, success, editedUsername, firstLetter, setEditedUsername,
    setIsEditing, fetchUser, handleUpdateUser, handleUpdatePassword, handleSaveUsername
  };
};
