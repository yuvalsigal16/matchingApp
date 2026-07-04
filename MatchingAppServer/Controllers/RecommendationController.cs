using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationController : ControllerBase
    {
        private readonly Recommendation bl = new();

        [HttpPost]
        public IActionResult Add([FromBody] Recommendation rec)
        {
            try
            {
                int id = bl.AddRecommendation(rec);
                return Ok(new { RecommendationID = id });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut]
        public IActionResult Update([FromBody] Recommendation rec)
        {
            try
            {
                int rows = bl.UpdateRecommendation(rec);
                return Ok(new { RowsAffected = rows });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                int rows = bl.DeleteRecommendation(id);
                return Ok(new { RowsAffected = rows });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("trip/{tripId}")]
        public IActionResult GetByTrip(int tripId)
        {
            try
            {
                return Ok(bl.GetByTripID(tripId));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // כל ההמלצות מכל המשתמשים (פיד גלובלי)
        [HttpGet("all")]
        public IActionResult GetAll()
        {
            try
            {
                return Ok(bl.GetAll());
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // כל ההמלצות של יעד מסוים מכל המשתמשים (למשל "רומא")
        [HttpGet("destination/{destination}")]
        public IActionResult GetByDestination(string destination)
        {
            try
            {
                return Ok(bl.GetByDestination(destination));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // העלאת תמונת המלצה — שומרת קובץ ל-wwwroot/images ומחזירה נתיב יחסי (כמו תמונת פרופיל,
        // אך בלי לגעת ב-DB). הנתיב שמתקבל נשמר בשדה MediaUrl בעת יצירת ההמלצה.
        [HttpPost("uploadImage")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { ok = false, message = "No file uploaded." });

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { ok = false, message = "File too large. Max 5MB." });

            string[] allowedExtensions = { ".jpg", ".jpeg", ".png" };
            string extension = Path.GetExtension(file.FileName).ToLower();
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { ok = false, message = "Only JPG and PNG files are allowed." });

            string[] allowedContentTypes = { "image/jpeg", "image/png" };
            if (!allowedContentTypes.Contains(file.ContentType))
                return BadRequest(new { ok = false, message = "Invalid file type." });

            try
            {
                string folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/images");
                if (!Directory.Exists(folderPath))
                    Directory.CreateDirectory(folderPath);

                string fileName = $"{Guid.NewGuid()}{extension}";
                string filePath = Path.Combine(folderPath, fileName);

                using (var stream = System.IO.File.Create(filePath))
                {
                    await file.CopyToAsync(stream);
                }

                return Ok(new { ok = true, imagePath = $"/images/{fileName}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { ok = false, message = ex.Message });
            }
        }

    }
}
