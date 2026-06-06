using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class User
    {
        public int UserID { get; set; }
        public string Email { get; set; }
        public string UserPassword { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? ProfileImage { get; set; }

        // שדות מועשרים מ-GetAllUsers - מאפשרים לקליינט להציג שם/גיל/תחומים/שאלון
        // בלי קריאות נוספות. NULL כשלמשתמש חסר פרופיל/שאלון.
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public DateTime? BirthDate { get; set; }
        public string? Gender { get; set; }
        public string? City { get; set; }

        public bool? IsSmoker { get; set; }
        public bool? KeepsKosher { get; set; }
        public bool? KeepsShabbat { get; set; }
        public int? SpontaneityLevel { get; set; }
        public int? LifestyleLevel { get; set; }

        // מחרוזת JSON של תחומי עניין (תוצאה של FOR JSON PATH ב-SP).
        // הקליינט מבצע JSON.parse כדי להפוך למערך של { interestName }.
        public string? Interests { get; set; }


        UserDAL dal = new UserDAL();

        // GET ALL USERS
        public List<User> GetAllUsers(int currentUserId)
        {
            List<User> users = dal.GetAllUsers(currentUserId);
            return users;
        }

        // REGISTER
        public int AddUser(User user)
        {
            if (user == null)
                throw new Exception("User cannot be null");

            if (string.IsNullOrWhiteSpace(user.Email))
                throw new Exception("Email is required");

            if (string.IsNullOrWhiteSpace(user.UserPassword))
                throw new Exception("Password is required");

            if (!user.Email.Contains("@"))
                throw new Exception("Invalid email format");

            user.UserPassword = BCrypt.Net.BCrypt.HashPassword(user.UserPassword);

            int id = dal.AddUser(user);

            if (id <= 0)
                throw new Exception("Failed to create user");

            return id;
        }

        // LOGIN
        public User Login(string email, string password)
        {
            if (string.IsNullOrWhiteSpace(email))
                throw new Exception("Email is required");

            if (string.IsNullOrWhiteSpace(password))
                throw new Exception("Password is required");
                User user = dal.LoginUser(email);

                if (user == null)
                    return null;

                bool isValid = BCrypt.Net.BCrypt.Verify(password, user.UserPassword);

                if (!isValid)
                    return null;

                user.UserPassword = null; // לא מחזירים hash ללקוח

                return user;
        }

        // GOOGLE LOGIN
        public User GoogleLogin(string email, string picture)
        {
            int userId = dal.AddOrGetGoogleUser(email, picture);

            return dal.GetUserById(userId);
        }


        // GET USER BY ID
        public User GetById(int id)
        {
            return dal.GetUserById(id);
        }

        // UPDATE USER 
        public int UpdateUser(User user)
        {
            if (user == null)
                throw new Exception("User cannot be null");

            if (user.UserID <= 0)
                throw new Exception("Invalid UserID");

            if (string.IsNullOrWhiteSpace(user.Email))
                throw new Exception("Email is required");

            if (!user.Email.Contains("@"))
                throw new Exception("Invalid email format");

            return dal.UpdateUser(user);
        }

        // CHANGE PASSWORD
        public int ChangePassword(int userId, string oldPass, string newPass)
        {
            if (userId <= 0)
                throw new Exception("Invalid user id");

            if (string.IsNullOrWhiteSpace(oldPass))
                throw new Exception("Old password is required");

            if (string.IsNullOrWhiteSpace(newPass))
                throw new Exception("New password is required");

            if (oldPass == newPass)
                throw new Exception("New password must be different");

            string hash = dal.GetPasswordHashByUserId(userId);

            if (string.IsNullOrEmpty(hash))
                throw new Exception("User not found");

            // בדיקת סיסמה ישנה
            if (!BCrypt.Net.BCrypt.Verify(oldPass, hash))
                throw new Exception("Old password is incorrect");

            // יצירת hash חדש
            string newHash = BCrypt.Net.BCrypt.HashPassword(newPass);

            return dal.ChangePassword(userId, newHash);
        }

        //DELETE USER
        public int DeleteUser(int userId)
        {
            if (userId <= 0)
                throw new Exception("Invalid user id");

            return dal.DeleteUser(userId);
        }

        // SAVE EXPO PUSH TOKEN - שומר ב-DB את ה-token של מכשיר המשתמש
        // לטובת שליחת push notifications גם כשהאפליקציה סגורה.
        public int SaveExpoPushToken(int userId, string token)
        {
            if (userId <= 0)
                throw new Exception("Invalid user id");

            if (string.IsNullOrWhiteSpace(token))
                throw new Exception("Token is required");

            return dal.SaveExpoPushToken(userId, token);
        }

        // GET EXPO PUSH TOKEN - לשימוש פנימי בעת שליחת התראה לטלפון
        public string GetExpoPushToken(int userId)
        {
            return dal.GetExpoPushToken(userId);
        }

    }
}
