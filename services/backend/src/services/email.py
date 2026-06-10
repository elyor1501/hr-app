import smtplib
import logging
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from src.core.config import settings

logger = logging.getLogger(__name__)


async def send_reset_email(to_email: str, reset_token: str) -> bool:
    try:
        reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Password Reset Request — VASPP RM System"
        msg["From"] = f"RM SYSTEM <{settings.smtp_from}>"
        msg["To"] = to_email

        text_body = f"""
Hello,

You requested a password reset for your VASPP Resource Management System account.

Click the link below to reset your password:
{reset_url}

This link will expire in {settings.reset_token_expire_minutes} minutes.

If you did not request this, please ignore this email.

VASPP HR Team
        """

        html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h2 style="color: #429ABD;">VASPP Resource Management System</h2>
  </div>
  <div style="background: #f9f9f9; border-radius: 12px; padding: 30px;">
    <h3 style="color: #333; margin-top: 0;">Password Reset Request</h3>
    <p style="color: #555;">You requested a password reset for your account.</p>
    <p style="color: #555;">Click the button below to reset your password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{reset_url}"
         style="background-color: #429ABD; color: white; padding: 14px 28px;
                text-decoration: none; border-radius: 8px; font-weight: bold;
                display: inline-block;">
        Reset Password
      </a>
    </div>
    <p style="color: #888; font-size: 13px;">
      This link expires in <strong>{settings.reset_token_expire_minutes} minutes</strong>.
    </p>
    <p style="color: #888; font-size: 13px;">
      If you did not request this, please ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="color: #aaa; font-size: 12px; text-align: center;">
      VASPP GmbH | Josef Reiert Str. 4 | 69190 Walldorf | Germany
    </p>
  </div>
</body>
</html>
        """

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        context = ssl.create_default_context()

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, to_email, msg.as_string())

        return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"[EMAIL ERROR] Authentication failed: {e}")
        return False
    except smtplib.SMTPConnectError as e:
        print(f"[EMAIL ERROR] Connection failed: {e}")
        return False
    except smtplib.SMTPException as e:
        print(f"[EMAIL ERROR] SMTP error: {e}")
        return False
    except Exception as e:
        print(f"[EMAIL ERROR] Unexpected error: {type(e).__name__}: {e}")
        return False


async def send_invite_email(to_email: str, invite_token: str) -> bool:
    try:
        invite_url = f"{settings.frontend_url}/register?token={invite_token}"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "You're Invited — VASPP RM System"
        msg["From"] = f"RM SYSTEM <{settings.smtp_from}>"
        msg["To"] = to_email

        text_body = f"""
Hello,

You have been invited to join the VASPP Resource Management System.

Click the link below to create your account:
{invite_url}

This link is valid for {settings.invite_token_expire_minutes} minutes only.
This link is personal and can only be used by you.

If you did not expect this invitation, please ignore this email.

VASPP HR Team
        """

        html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h2 style="color: #429ABD;">VASPP Resource Management System</h2>
  </div>
  <div style="background: #f9f9f9; border-radius: 12px; padding: 30px;">
    <h3 style="color: #333; margin-top: 0;">You're Invited!</h3>
    <p style="color: #555;">You have been invited to join the VASPP Resource Management System.</p>
    <p style="color: #555;">Click the button below to create your account:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{invite_url}"
         style="background-color: #429ABD; color: white; padding: 14px 28px;
                text-decoration: none; border-radius: 8px; font-weight: bold;
                display: inline-block;">
        Create Account
      </a>
    </div>
    <p style="color: #888; font-size: 13px;">
      This link expires in <strong>{settings.invite_token_expire_minutes} minutes</strong> and is valid for your email only.
    </p>
    <p style="color: #888; font-size: 13px;">
      If you did not expect this invitation, please ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="color: #aaa; font-size: 12px; text-align: center;">
      VASPP GmbH | Josef Reiert Str. 4 | 69190 Walldorf | Germany
    </p>
  </div>
</body>
</html>
        """

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        context = ssl.create_default_context()

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, to_email, msg.as_string())

        return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"[EMAIL ERROR] Authentication failed: {e}")
        return False
    except smtplib.SMTPConnectError as e:
        print(f"[EMAIL ERROR] Connection failed: {e}")
        return False
    except smtplib.SMTPException as e:
        print(f"[EMAIL ERROR] SMTP error: {e}")
        return False
    except Exception as e:
        print(f"[EMAIL ERROR] Unexpected error: {type(e).__name__}: {e}")
        return False