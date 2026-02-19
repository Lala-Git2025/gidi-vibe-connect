# Password Reset Email Configuration

## Steps to Configure in Supabase Dashboard

### 1. Access Email Settings
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **gidi-vibe-connect**
3. Navigate to: **Authentication** → **Email Templates**

### 2. Configure Email Templates

#### Option A: Use Supabase Default SMTP (Easiest)
- Supabase provides built-in email service
- Already configured, just need to customize templates
- **No additional setup required!**

#### Option B: Custom SMTP (Professional)
1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Enter your SMTP credentials:
   - **Host**: `smtp.gmail.com` (or your provider)
   - **Port**: `587` (TLS) or `465` (SSL)
   - **Username**: Your email
   - **Password**: App-specific password
   - **Sender Email**: `noreply@gidivibe.com` (or your domain)
   - **Sender Name**: `Gidi Vibe Connect`

### 3. Customize Password Reset Template

In **Email Templates** → **Reset Password**:

```html
<h2>Reset Your Password</h2>

<p>Hi there,</p>

<p>We received a request to reset your password for your Gidi Vibe Connect account.</p>

<p>Click the button below to reset your password:</p>

<a href="{{ .ConfirmationURL }}"
   style="background-color: #EAB308; color: black; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
  Reset Password
</a>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p><strong>This link will expire in 1 hour.</strong></p>

<p>If you didn't request this, you can safely ignore this email.</p>

<p>Best,<br>The Gidi Vibe Connect Team</p>
```

### 4. Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add redirect URLs:
   ```
   http://localhost:8080/reset-password
   http://localhost:5173/reset-password
   https://yourdomain.com/reset-password
   ```

### 5. Test the Flow

**In your app**:
```typescript
// Already implemented in your auth components
await supabase.auth.resetPasswordForEmail('user@example.com', {
  redirectTo: 'http://localhost:8080/reset-password',
});
```

### 6. Create Reset Password Page (if needed)

Check if [src/pages/ResetPassword.tsx](src/pages/ResetPassword.tsx) exists.

If not, I can create it for you!

---

## ✅ Verification

After configuration:
1. Go to your app's login page
2. Click "Forgot Password"
3. Enter your email
4. Check inbox for reset email
5. Click link and reset password
6. Login with new password

---

**Status**: ⏱️ Takes 5-10 minutes via dashboard
**No code changes needed** - Supabase handles everything!
