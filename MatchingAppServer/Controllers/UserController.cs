using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;
using MatchingAppServer.DAL;
using MatchingAppServer.Models;
using MatchingAppServer.Services;
using Microsoft.AspNetCore.Authorization;
using Google.Apis.Auth;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        User bl = new User();
        private readonly JwtService _jwtService;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _config;
        public UserController(JwtService jwtService, IEmailService emailService, IConfiguration config)
        {
            _jwtService = jwtService;
            _emailService = emailService;
            _config = config;
        }


        [HttpGet]
        public IActionResult GetAllUsers(int currentUserId)
        {
            try
            {
                return Ok(bl.GetAllUsers(currentUserId));
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    ok = false,
                    message = ex.Message
                });
            }
        }

        // REGISTER
        [HttpPost("register")]
        public IActionResult Register([FromBody] User user)
        {
            try
            {
                int id = bl.AddUser(user);
                return Ok(id);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    ok = false,
                    message = ex.Message
                });
            }
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] User user)
        {
            try
            {
                if (user == null)
                    return BadRequest("Request body is empty");

                var result = bl.Login(user.Email, user.UserPassword);

                if (result == null)
                    return Unauthorized("Invalid email or password");

                // יצירת טוקן JWT למשתמש שהצליח להתחבר
                var token = _jwtService.GenerateToken(result.UserID, result.Email);

                // מחזירים אובייקט אנונימי - רק שדות שהלקוח צריך.
                // לא חושפים UserPassword/CreatedAt בתגובה.
                return Ok(new
                {
                    token,
                    user = new
                    {
                        result.UserID,
                        result.Email,
                        result.ProfileImage
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    ok = false,
                    message = ex.Message
                });
            }
        }

        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest req)
        {
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { "686734513306-p22tbgjspd1lrt38b96fm6j2u68656nj.apps.googleusercontent.com" }
                };

                var payload = await GoogleJsonWebSignature.ValidateAsync(req.IdToken, settings);

                var user = bl.GoogleLogin(payload.Email, payload.Picture);

                var token = _jwtService.GenerateToken(user.UserID, user.Email);

                // מחזירים אובייקט אנונימי - רק שדות שהלקוח צריך.
                return Ok(new
                {
                    token,
                    user = new
                    {
                        user.UserID,
                        user.Email,
                        user.ProfileImage
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { ok = false, message = ex.Message });
            }
        }

        // GET BY ID
        [Authorize]
        [HttpGet("{id}")]
        public IActionResult Get(int id)
        {
            try
            {
                var result = bl.GetById(id);

                if (result == null)
                    return NotFound();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    ok = false,
                    message = ex.Message
                });
            }
        }

        // UPDATE
        [Authorize]
        [HttpPut]
        public IActionResult Update([FromBody] User user)
        {
            try
            {
                int rows = bl.UpdateUser(user);

                if (rows > 0)
                    return Ok("Updated");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    ok = false,
                    message = ex.Message
                });
            }

        }

        //CHANGE PASSWORD
        [Authorize]
        [HttpPut("change-password")]
        public IActionResult ChangePassword([FromBody] ChangePasswordRequest req)
        {
            try
            {
                int result = bl.ChangePassword(req.UserID, req.OldPassword, req.NewPassword);

                if (result > 0)
                    return Ok("Password updated");

                return BadRequest("Update failed");
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    ok = false,
                    message = ex.Message
                });
            }
        }

        // FORGOT PASSWORD — שליחת קישור איפוס למייל. תמיד תגובה גנרית (anti-enumeration).
        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
        {
            try
            {
                string rawToken = bl.RequestPasswordReset(req?.Email);
                if (rawToken != null)
                {
                    string linkBase = _config["App:ResetLinkBase"] ?? "matchingapp://reset-password";
                    string link = $"{linkBase}?token={rawToken}";
                    await _emailService.SendPasswordResetEmailAsync(req.Email.Trim(), link);
                }
            }
            catch
            {
                // בכוונה לא חושפים דבר — נשמרת תגובה גנרית זהה בכל מקרה
            }

            return Ok(new { message = "אם המייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה." });
        }

        // RESET PASSWORD — איפוס בפועל לפי הטוקן מהקישור.
        [AllowAnonymous]
        [HttpPost("reset-password")]
        public IActionResult ResetPassword([FromBody] ResetPasswordRequest req)
        {
            try
            {
                bl.ResetPassword(req?.Token, req?.NewPassword);
                return Ok(new { message = "הסיסמה אופסה בהצלחה" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { ok = false, message = ex.Message });
            }
        }

        // DELETE USER
        [Authorize]
        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                int result = bl.DeleteUser(id);

                if (result > 0)
                    return Ok("User deleted successfully");

                return NotFound("User not found");
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    ok = false,
                    message = ex.Message
                });
            }
        }

        // SAVE EXPO PUSH TOKEN - לטובת שליחת push notifications לטלפון של המשתמש
        [Authorize]
        [HttpPost("pushToken")]
        public IActionResult SavePushToken([FromBody] PushTokenRequest req)
        {
            try
            {
                int result = bl.SaveExpoPushToken(req.UserID, req.Token);

                if (result > 0)
                    return Ok("Token saved");

                return NotFound("User not found");
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    ok = false,
                    message = ex.Message
                });
            }
        }

    }

    // DTO לבקשת שמירת push token
    public class PushTokenRequest
    {
        public int UserID { get; set; }
        public string Token { get; set; }
    }
}
