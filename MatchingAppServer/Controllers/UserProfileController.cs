using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserProfileController : ControllerBase
    {
        UserProfile bl = new UserProfile();

        // GET ALL PROFILES
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

        // ADD PROFILE
        [HttpPost]
        public IActionResult Add([FromBody] UserProfile profile)
        {
            try
            {
                int id = bl.AddProfile(profile);
                return Ok(id);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // UPDATE PROFILE
        [HttpPut]
        public IActionResult Update([FromBody] UserProfile profile)
        {
            try
            {
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
