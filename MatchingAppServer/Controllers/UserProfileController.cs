using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserProfileController : ControllerBase
    {
        UserProfile bl = new UserProfile();

        // שולף את UserID של המשתמש המחובר מה-JWT (אותו דפוס כמו שאר ה-controllers).
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        // GET ALL PROFILES
        [Authorize]
        [HttpGet]
        public IActionResult GetAllProfiles()
        {
            try
            {
                var result = bl.GetAllProfiles();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET BY USER ID
        [Authorize]
        [HttpGet("{userId}")]
        public IActionResult GetByUserId(int userId)
        {
            try
            {
                var result = bl.GetByUserId(userId);

                if (result == null)
                    return NotFound();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET PROFILE IMAGE PATH BY USER ID
        // נקודת קצה ייעודית להבאת הנתיב של תמונת הפרופיל בלבד.
        // משתמשת ב-GetUserProfileImageByUserId שכבר קיימת ב-BL/DAL.
        [Authorize]
        [HttpGet("image/{userId}")]
        public IActionResult GetProfileImageByUserId(int userId)
        {
            try
            {
                if (userId <= 0)
                    return BadRequest(new { ok = false, message = "Invalid user id." });

                string? imagePath = bl.GetUserProfileImageByUserId(userId);

                if (string.IsNullOrEmpty(imagePath))
                    return NotFound(new { ok = false, message = "No profile image found." });

                return Ok(new { ok = true, userId, imagePath });
            }
            catch (Exception ex)
            {
                return BadRequest(new { ok = false, message = ex.Message });
            }
        }

        // ADD PROFILE
        [Authorize]
        [HttpPost]
        public IActionResult Add([FromBody] UserProfile profile)
        {
            try
            {
                // הפרופיל משויך למשתמש המחובר בלבד (UserID מה-JWT, לא מה-body).
                profile.UserID = GetCurrentUserId();
                int id = bl.AddProfile(profile);
                return Ok(id);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // UPDATE PROFILE
        [Authorize]
        [HttpPut]
        public IActionResult Update([FromBody] UserProfile profile)
        {
            try
            {
                // עדכון פרופיל של המשתמש המחובר בלבד (UserID מה-JWT, לא מה-body).
                profile.UserID = GetCurrentUserId();
                int result = bl.UpdateProfile(profile);

                if (result > 0)
                    return Ok("Updated");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // פונקציה אחת שמטפלת גם בהעלאה ראשונה וגם בהחלפת תמונה קיימת.
        // אם יש תמונה ישנה - היא תימחק אחרי שהתמונה החדשה נשמרה וה-DB התעדכן בהצלחה.
        [Authorize]
        [HttpPut("updateImage/{id}")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdateProfileImage(int id, IFormFile file)
        {
            // בדיקה שה-ID תקין
            if (id <= 0)
                return BadRequest(new { ok = false, message = "Invalid user id." });

            // משתמש יכול לעדכן רק את התמונה של עצמו (id חייב להתאים ל-JWT).
            if (GetCurrentUserId() != id)
                return Forbid();

            // בדיקה שהמשתמש באמת שלח קובץ ולא ריק
            if (file == null || file.Length == 0)
                return BadRequest(new { ok = false, message = "No file uploaded." });

            // בדיקת גודל מקסימלי - 5MB
            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { ok = false, message = "File too large. Max 5MB." });

            // בדיקת סיומת
            string[] allowedExtensions = { ".jpg", ".jpeg", ".png" };
            string extension = Path.GetExtension(file.FileName).ToLower();
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { ok = false, message = "Only JPG and PNG files are allowed." });

            // בדיקת ContentType (הגנה נוספת - משתמש זדוני יכול לשנות שם קובץ)
            string[] allowedContentTypes = { "image/jpeg", "image/png" };
            if (!allowedContentTypes.Contains(file.ContentType))
                return BadRequest(new { ok = false, message = "Invalid file type." });

            // נשמור את הנתיב מחוץ ל-try כדי שנוכל לנקות את הקובץ אם קרתה שגיאה
            string newFilePath = string.Empty;

            try
            {
                // 1. שליפת התמונה הישנה (אם יש) - כדי למחוק אותה בסוף
                string? oldImage = bl.GetUserProfileImageByUserId(id);
                // 2. הכנת התיקייה
                string folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/images");
                if (!Directory.Exists(folderPath))
                    Directory.CreateDirectory(folderPath);

                // 3. יצירת שם ייחודי ושמירת הקובץ החדש לדיסק
                string fileName = $"{Guid.NewGuid()}{extension}";
                newFilePath = Path.Combine(folderPath, fileName);

                using (var stream = System.IO.File.Create(newFilePath))
                {
                    await file.CopyToAsync(stream);
                }

                // 4. עדכון ה-DB עם הנתיב היחסי
                string relativePath = $"/images/{fileName}";
                int rowCount = bl.UpdateProfileImage(id, relativePath);

                // 5. אם ה-DB לא התעדכן - rollback: מוחקים את הקובץ החדש
                if (rowCount <= 0)
                {
                    if (System.IO.File.Exists(newFilePath))
                        System.IO.File.Delete(newFilePath);

                    return NotFound(new { ok = false, message = "User not found or image not updated." });
                }

                // 6. הצלחה - עכשיו בטוח למחוק את התמונה הישנה מהדיסק
                if (!string.IsNullOrEmpty(oldImage))
                {
                    string oldPath = Path.Combine(
                        Directory.GetCurrentDirectory(),
                        "wwwroot",
                        oldImage.TrimStart('/')
                    );
                    if (System.IO.File.Exists(oldPath))
                        System.IO.File.Delete(oldPath);
                }

                return Ok(new
                {
                    ok = true,
                    userId = id,
                    imagePath = relativePath
                });
            }
            catch (Exception ex)
            {
                // אם קרתה שגיאה ונוצר כבר קובץ חדש - מוחקים אותו כדי לא להשאיר קבצים מיותרים
                if (!string.IsNullOrEmpty(newFilePath) && System.IO.File.Exists(newFilePath))
                    System.IO.File.Delete(newFilePath);

                return BadRequest(new
                {
                    ok = false,
                    message = ex.Message
                });
            }
        }

        // מחיקת תמונת פרופיל - מחזיר רק את התוצאה של המחיקה (בלי נתיב חדש)
        [Authorize]
        [HttpDelete("deleteImage/{id}")]
        public IActionResult DeleteImage(int id)
        {
            // משתמש יכול למחוק רק את התמונה של עצמו (id חייב להתאים ל-JWT).
            if (GetCurrentUserId() != id)
                return Forbid();

            try
            {
                // 1. קודם שולפים את התמונה הישנה
                string? oldImage = bl.GetUserProfileImageByUserId(id);

                // 2. מוחקים מה-DB
                int result = bl.DeleteProfileImage(id);

                if (result > 0)
                {
                    // 3. מוחקים מהדיסק
                    if (!string.IsNullOrEmpty(oldImage))
                    {
                        string oldPath = Path.Combine(
                            Directory.GetCurrentDirectory(),
                            "wwwroot",
                            oldImage.TrimStart('/')
                        );

                        if (System.IO.File.Exists(oldPath))
                            System.IO.File.Delete(oldPath);
                    }

                    return Ok(new { ok = true });
                }

                return NotFound(new { ok = false });
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
