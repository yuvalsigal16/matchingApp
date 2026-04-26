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
        public UserController(JwtService jwtService)
        {
            _jwtService = jwtService;
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

                return Ok(new
                {
                    token,
                    user = result
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

                return Ok(new
                {
                    token,
                    user
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


        


    }
}
