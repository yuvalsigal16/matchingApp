using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class UserProfile
    {
        public int ProfileID { get; set; }
        public int UserID { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public DateTime BirthDate { get; set; }
        public string? Gender { get; set; }
        public string? City { get; set; }
        public string? ProfileImage { get; set; }

        public DateTime LastUpdated { get; set; }

        UserProfileDAL dal = new UserProfileDAL();

        // GET ALL USER PROFILES
        public List<UserProfile> GetAllProfiles()
        {
            return dal.GetAllUserProfiles();
        }

        // GET USER PROFILE BY USER ID
        public UserProfile GetByUserId(int userId)
        {
            return dal.GetByUserId(userId);
        }

        // ADD
        public int AddProfile(UserProfile profile)
        {
            return dal.AddProfile(profile);
        }

        // UPDATE
        public int UpdateProfile(UserProfile profile)
        {
            return dal.UpdateProfile(profile);
        }

        // UPDATE PROFILE IMAGE
        public int UpdateProfileImage(int userId, string filePath)
        {
            if (userId <= 0)
                throw new ArgumentException("Invalid user id");

            if (string.IsNullOrEmpty(filePath))
                throw new ArgumentException("Invalid image path");

            return dal.UpdateProfileImage(userId, filePath);
        }

        // DELETE PROFILE IMAGE
        public int DeleteProfileImage(int userId)
        {
            if (userId <= 0)
                throw new ArgumentException("Invalid user id");

            return dal.DeleteProfileImage(userId);
        }

        // GET USER PROFILE IMAGE BY USER ID
        public string? GetUserProfileImageByUserId(int userId)
        {
            if (userId <= 0)
                throw new ArgumentException("Invalid user id");

            return dal.GetUserProfileImageByUserId(userId);
        }
    }
}
