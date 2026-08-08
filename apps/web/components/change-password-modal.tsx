"use client"

import { useState, useMemo } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { authService } from '../lib/api/services'
import { Button } from '@repo/ui'
import { Input } from '@repo/ui'
import { Label } from '@repo/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui'
import { toast } from '../lib/toast';

interface PasswordStrength {
  score: number
  feedback: string[]
  isValid: boolean
}

function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0

  // Check length
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long')
  } else if (password.length >= 8 && password.length < 12) {
    score += 1
  } else if (password.length >= 12) {
    score += 2
  }

  // Check for uppercase
  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Password should contain at least one uppercase letter')
  }

  // Check for lowercase
  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Password should contain at least one lowercase letter')
  }

  // Check for numbers
  if (/[0-9]/.test(password)) {
    score += 1
  } else {
    feedback.push('Password should contain at least one number')
  }

  // Check for symbols
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1
  } else {
    feedback.push('Password should contain at least one special character')
  }

  // Check for common patterns
  const commonPatterns = ['12345', 'password', 'qwerty', 'abc123', '111111']
  const lowerPassword = password.toLowerCase()
  for (const pattern of commonPatterns) {
    if (lowerPassword.includes(pattern)) {
      score -= 2
      feedback.push('Password contains common patterns')
      break
    }
  }

  // Minimum requirements: length >= 8 and score >= 4
  const isValid = password.length >= 8 && score >= 4

  return {
    score: Math.max(0, score),
    feedback,
    isValid
  }
}

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordStrength = useMemo(() => {
    if (!newPassword) return null
    return validatePasswordStrength(newPassword)
  }, [newPassword])

  const passwordMatchError = useMemo(() => {
    if (!confirmPassword || !newPassword) return null
    if (confirmPassword !== newPassword) {
      return 'Passwords do not match'
    }
    return null
  }, [newPassword, confirmPassword])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!currentPassword || !newPassword) {
      setError('Please fill all fields')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (passwordStrength && !passwordStrength.isValid) {
      setError('Password does not meet strength requirements')
      return
    }
    try {
      setSubmitting(true)
      await toast.promise(
        authService.changePassword(currentPassword, newPassword),
        {
          loading: 'Changing password...',
          success: 'Password updated successfully',
          error: (err: any) => {
            const title = err?.response?.data?.error || 'Failed to change password'
            const details = err?.response?.data?.details || err?.message
            return details && details !== title ? `${title}: ${details}` : title
          }
        }
      );
      setSuccess('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        onClose()
      }, 800)
    } catch (err: any) {
      setError(err?.message || 'Failed to change password')
      toast.error(err?.message || 'Failed to change password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {(() => { 
        const DialogContentAny = DialogContent as any; 
        const DialogHeaderAny = DialogHeader as any;
        const DialogTitleAny = DialogTitle as any;
        const DialogDescriptionAny = DialogDescription as any;
        return (
      <DialogContentAny className="sm:max-w-[425px]">
        <DialogHeaderAny>
          <DialogTitleAny>Change Password</DialogTitleAny>
          <DialogDescriptionAny>
            Enter your current and new password.
          </DialogDescriptionAny>
        </DialogHeaderAny>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                className="pr-10"
                aria-invalid={passwordStrength ? !passwordStrength.isValid : false}
                aria-describedby={passwordStrength ? "password-strength" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordStrength && (
              <div id="password-strength" className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        passwordStrength.score >= 4
                          ? 'bg-green-500'
                          : passwordStrength.score >= 2
                          ? 'bg-indigo-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {passwordStrength.score >= 4 ? 'Strong' : passwordStrength.score >= 2 ? 'Medium' : 'Weak'}
                  </span>
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {passwordStrength.feedback.slice(0, 3).map((msg, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-red-500">•</span>
                        <span>{msg}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pr-10"
                aria-invalid={!!passwordMatchError}
                aria-describedby={passwordMatchError ? "password-match-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordMatchError && (
              <p id="password-match-error" className="text-xs text-red-600">
                {passwordMatchError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || (passwordStrength && !passwordStrength.isValid) || !!passwordMatchError}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? 'Saving...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContentAny>
      ); })()}
    </Dialog>
  )
}


