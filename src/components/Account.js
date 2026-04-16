import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { updatePassword, updateEmail, EmailAuthProvider, linkWithCredential } from 'firebase/auth';

export default function Account() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if user has password authentication
  const hasPasswordAuth = user?.providerData?.some(provider => provider.providerId === 'password');
  const hasGoogleAuth = user?.providerData?.some(provider => provider.providerId === 'google.com');

  const createdDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  const lastSignIn = user?.metadata?.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Update email if changed
      if (newEmail !== user.email) {
        await updateEmail(user, newEmail);
        addToast('Email updated successfully', 'success');
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          addToast('Passwords do not match', 'error');
          setIsLoading(false);
          return;
        }
        if (newPassword.length < 6) {
          addToast('Password must be at least 6 characters', 'error');
          setIsLoading(false);
          return;
        }

        // If user only has Google auth, link email/password
        if (hasGoogleAuth && !hasPasswordAuth) {
          try {
            const credential = EmailAuthProvider.credential(newEmail || user.email, newPassword);
            await linkWithCredential(user, credential);
            addToast('Password login enabled! You can now login with email/password', 'success');
          } catch (error) {
            if (error.code === 'auth/credential-already-in-use') {
              addToast('This email is already associated with another account', 'error');
            } else {
              throw error;
            }
          }
        } else {
          // User already has password auth, just update it
          await updatePassword(user, newPassword);
          addToast('Password updated successfully', 'success');
        }

        setNewPassword('');
        setConfirmPassword('');
      }

      setIsEditing(false);
    } catch (error) {
      addToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="panel">
      <h2>Account Information</h2>
      
      <div className="account-info">
        <div className="info-section">
          <h3>Login Methods</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {hasGoogleAuth && (
              <span style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
                ✓ Google Login
              </span>
            )}
            {hasPasswordAuth && (
              <span style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
                ✓ Email/Password
              </span>
            )}
            {!hasPasswordAuth && hasGoogleAuth && (
              <span style={{ padding: '6px 12px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '6px', fontSize: '13px', fontWeight: '500', color: '#92400e' }}>
                ⚠ Set password to enable email/password login
              </span>
            )}
          </div>
        </div>

        <div className="info-section">
          <h3>Email</h3>
          {!isEditing ? (
            <p className="info-value">{user?.email}</p>
          ) : (
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="account-input"
            />
          )}
        </div>

        <div className="info-section">
          <h3>User ID</h3>
          <p className="info-value" style={{ fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{user?.uid}</p>
        </div>

        <div className="info-section">
          <h3>Account Created</h3>
          <p className="info-value">{createdDate}</p>
        </div>

        <div className="info-section">
          <h3>Last Sign In</h3>
          <p className="info-value">{lastSignIn}</p>
        </div>

        {isEditing && (
          <>
            <div className="info-section">
              <h3>{hasPasswordAuth ? 'New Password' : 'Set Password for Email Login'}</h3>
              <input
                type="password"
                placeholder={hasPasswordAuth ? 'Leave blank to keep current password' : 'Create a password for email/password login'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="account-input"
              />
            </div>

            <div className="info-section">
              <h3>Confirm Password</h3>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="account-input"
              />
            </div>

            {!hasPasswordAuth && hasGoogleAuth && (
              <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '14px', color: '#166534', marginBottom: '12px' }}>
                ✓ Setting a password will enable email/password login in addition to Google login
              </div>
            )}
          </>
        )}

        <div className="button-group">
          {!isEditing ? (
            <button 
              className="btn"
              onClick={() => setIsEditing(true)}
            >
              Edit Account
            </button>
          ) : (
            <>
              <button
                className="btn"
                onClick={handleUpdateProfile}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditing(false);
                  setNewEmail(user?.email);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
