using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;
using System.Data;

namespace MatchingAppServer.DAL
{
    public class UserDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // GET ALL USERS
        public List<User> GetAllUsers(int currentUserId)
        {
            try
            {
                con = connect();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error connecting to database: " + ex.Message);
                throw;
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>()
            {
                { "@CurrentUserID", currentUserId }
            };

            //יצירת פקודה שמפעילה את הפונקציה הזו
            cmd = CreateCommandWithStoredProcedureGeneral("GetAllUsers", con, paramDic);
            try
            {
                List<User> users = new List<User>();
                reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    // קריאת כל 14 העמודות שה-SP מחזיר -
                    // מנע 63 קריאות נוספות בקליינט (פרופיל/תחומים/שאלון לכל משתמש).
                    users.Add(new User()
                    {
                        UserID    = Convert.ToInt32(reader["UserID"]),
                        Email     = reader["Email"].ToString(),
                        CreatedAt = Convert.ToDateTime(reader["CreatedAt"]),

                        FirstName    = reader["FirstName"]    == DBNull.Value ? null : reader["FirstName"].ToString(),
                        LastName     = reader["LastName"]     == DBNull.Value ? null : reader["LastName"].ToString(),
                        BirthDate    = reader["BirthDate"]    == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["BirthDate"]),
                        Gender       = reader["Gender"]       == DBNull.Value ? null : reader["Gender"].ToString(),
                        City         = reader["City"]         == DBNull.Value ? null : reader["City"].ToString(),
                        ProfileImage = reader["ProfileImage"] == DBNull.Value ? null : reader["ProfileImage"].ToString(),

                        IsSmoker         = reader["IsSmoker"]         == DBNull.Value ? (bool?)null : Convert.ToBoolean(reader["IsSmoker"]),
                        KeepsKosher      = reader["KeepsKosher"]      == DBNull.Value ? (bool?)null : Convert.ToBoolean(reader["KeepsKosher"]),
                        KeepsShabbat     = reader["KeepsShabbat"]     == DBNull.Value ? (bool?)null : Convert.ToBoolean(reader["KeepsShabbat"]),
                        SpontaneityLevel = reader["SpontaneityLevel"] == DBNull.Value ? (int?)null  : Convert.ToInt32(reader["SpontaneityLevel"]),
                        LifestyleLevel   = reader["LifestyleLevel"]   == DBNull.Value ? (int?)null  : Convert.ToInt32(reader["LifestyleLevel"]),

                        // Interests מגיע כמחרוזת JSON (FOR JSON PATH ב-SP)
                        Interests = reader["Interests"] == DBNull.Value ? null : reader["Interests"].ToString(),
                    });
                }
                return users;
            }
            catch (Exception) { throw; }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        // REGISTER
        public int AddUser(User user)
        {
            try
            {
                con = connect();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error connecting to database: " + ex.Message);
                throw;
            }

            var param = new Dictionary<string, object>()
            {
                {"@Email", user.Email},
                {"@UserPassword", user.UserPassword},
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddUser", con, param);

            try
            {
                reader = cmd.ExecuteReader();
                if (reader.Read())
                    return Convert.ToInt32(reader["UserID"]);
                return -1;
            }
            finally { con.Close(); }
        }

        // LOGIN
        public User LoginUser(string email)
        {
            try
            {
                con = connect();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error connecting to database: " + ex.Message);
                throw;
            }

            var param = new Dictionary<string, object>()
            {
                {"@Email", email},
            };

            cmd = CreateCommandWithStoredProcedureGeneral("LoginUserByEmail", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    return new User
                    {
                        UserID = (int)reader["UserID"],
                        Email = reader["Email"].ToString(),
                        UserPassword = reader["UserPassword"].ToString(), 
                        CreatedAt = (DateTime)reader["CreatedAt"]
                    };
                }
                return null;
            }
            catch (Exception)
            {
                throw;
            }
            finally 
            {
                if (con != null)
                    con.Close(); 
            }
        }

        //GOOGLE LOGIN
        public int AddOrGetGoogleUser(string email, string image)
        {
            try
            {
                con = connect();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error connecting to database: " + ex.Message);
                throw;
            }


            var param = new Dictionary<string, object>()
            {
                {"@Email", email},
                {"@ProfileImage", image}
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddOrGetGoogleUser", con, param);

            try
            {
                reader = cmd.ExecuteReader();
                if (reader.Read())
                    return Convert.ToInt32(reader["UserID"]);

                return -1;
            }
            catch (Exception)
            {
                throw;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        // GET USER BY ID
        public User GetUserById(int id)
        {
            try
            {
                con = connect();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error connecting to database: " + ex.Message);
                throw;
            }

            var param = new Dictionary<string, object>()
            {
                {"@UserID", id}
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetUserByID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    return new User
                    {
                        UserID = (int)reader["UserID"],
                        Email = reader["Email"].ToString(),
                        CreatedAt = (DateTime)reader["CreatedAt"]
                    };
                }
                return null;
            }
            finally
            {
                con.Close();
            }
        }

        // UPDATE USER
        public int UpdateUser(User user)
        {
            try
            {
                con = connect();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error connecting to database: " + ex.Message);
                throw;
            }

            var param = new Dictionary<string, object>()
            {
                {"@UserID", user.UserID},
                {"@Email", user.Email},
            };

            cmd = CreateCommandWithStoredProcedureGeneral("UpdateUser", con, param);

            try
            {
                reader = cmd.ExecuteReader();
                if (reader.Read())
                    return Convert.ToInt32(reader["RowsAffected"]);
                return 0;
            }
            finally { con.Close(); }
        }

        //// שליפת ה-hash של הסיסמה לפי UserID (לצורך אימות בעת החלפת סיסמה)
        public string GetPasswordHashByUserId(int userId)
        {
            try
            {
                con = connect();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error connecting to database: " + ex.Message);
                throw;
            }

            var param = new Dictionary<string, object>()
            {
                {"@UserID", userId}
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetPasswordHashByUserID", con, param);

            try
            {
                object result = cmd.ExecuteScalar();
                return result?.ToString();
            }
            finally
            {
                con?.Close();
            }
        }

        //CHANGE PASSWORD - מקבל רק את ה-hash החדש (האימות של הישנה נעשה ב-BL)
        public int ChangePassword(int userId, string newPasswordHash)
        {
            try
            {
                con = connect();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error connecting to database: " + ex.Message);
                throw;
            }

            var param = new Dictionary<string, object>()
            {
              {"@UserID", userId},
              {"@NewPassword", newPasswordHash}
             };

            cmd = CreateCommandWithStoredProcedureGeneral("ChangeUserPassword", con, param);

            try
            {
                reader = cmd.ExecuteReader();
                if (reader.Read())
                    return Convert.ToInt32(reader["RowsAffected"]);
                return 0;
            }
            finally
            {
                con.Close();
            }
        }

        // ── FORGOT PASSWORD ──

        // זיהוי משתמש לפי מייל. מחזיר UserID, או 0 אם לא נמצא.
        public int GetUserIdByEmail(string email)
        {
            try { con = connect(); }
            catch (Exception ex) { Console.WriteLine("Error connecting to database: " + ex.Message); throw; }

            var param = new Dictionary<string, object>() { { "@Email", email } };
            cmd = CreateCommandWithStoredProcedureGeneral("GetUserIdByEmail", con, param);
            try
            {
                object result = cmd.ExecuteScalar();
                return result == null ? 0 : Convert.ToInt32(result);
            }
            finally { con?.Close(); }
        }

        // יצירת טוקן איפוס (ה-SP מבטל קודם את הטוקנים הישנים). מחזיר TokenID.
        public int CreatePasswordResetToken(int userId, string tokenHash, DateTime expiresAt)
        {
            try { con = connect(); }
            catch (Exception ex) { Console.WriteLine("Error connecting to database: " + ex.Message); throw; }

            var param = new Dictionary<string, object>()
            {
                { "@UserID", userId },
                { "@TokenHash", tokenHash },
                { "@ExpiresAt", expiresAt }
            };
            cmd = CreateCommandWithStoredProcedureGeneral("CreatePasswordResetToken", con, param);
            try
            {
                object result = cmd.ExecuteScalar();
                return result == null ? 0 : Convert.ToInt32(result);
            }
            finally { con?.Close(); }
        }

        // שליפת טוקן לפי hash (או null). האימות עצמו נעשה ב-BL.
        public PasswordResetToken GetPasswordResetToken(string tokenHash)
        {
            try { con = connect(); }
            catch (Exception ex) { Console.WriteLine("Error connecting to database: " + ex.Message); throw; }

            var param = new Dictionary<string, object>() { { "@TokenHash", tokenHash } };
            cmd = CreateCommandWithStoredProcedureGeneral("GetPasswordResetToken", con, param);
            try
            {
                reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    return new PasswordResetToken
                    {
                        TokenID = Convert.ToInt32(reader["TokenID"]),
                        UserID = Convert.ToInt32(reader["UserID"]),
                        ExpiresAt = Convert.ToDateTime(reader["ExpiresAt"]),
                        Used = Convert.ToBoolean(reader["Used"])
                    };
                }
                return null;
            }
            finally { con.Close(); }
        }

        // סימון טוקן כמנוצל (חד-פעמי). מחזיר מספר שורות שהושפעו.
        public int MarkPasswordResetTokenUsed(int tokenId)
        {
            try { con = connect(); }
            catch (Exception ex) { Console.WriteLine("Error connecting to database: " + ex.Message); throw; }

            var param = new Dictionary<string, object>() { { "@TokenID", tokenId } };
            cmd = CreateCommandWithStoredProcedureGeneral("MarkPasswordResetTokenUsed", con, param);
            try
            {
                reader = cmd.ExecuteReader();
                if (reader.Read())
                    return Convert.ToInt32(reader["RowsAffected"]);
                return 0;
            }
            finally { con.Close(); }
        }

        // DELETE USER
        public int DeleteUser(int userId)
        {
            try
            {
                con = connect();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error connecting to database: " + ex.Message);
                throw;
            }

            var param = new Dictionary<string, object>()
            {
                { "@UserID", userId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("DeleteUser", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                    return Convert.ToInt32(reader["Success"]);

                return 0;
            }
            catch (Exception)
            {
                throw;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        // SAVE EXPO PUSH TOKEN - שומר את ה-token של המכשיר ב-DB
        public int SaveExpoPushToken(int userId, string token)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@UserID", userId },
                { "@Token", token }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("SaveExpoPushToken", con, param);

            try
            {
                object result = cmd.ExecuteScalar();
                return Convert.ToInt32(result);
            }
            catch (Exception)
            {
                throw;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        // GET EXPO PUSH TOKEN - שולף את ה-token לטובת שליחת push
        public string GetExpoPushToken(int userId)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@UserID", userId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetExpoPushToken", con, param);

            try
            {
                object result = cmd.ExecuteScalar();
                return result == null || result == DBNull.Value ? null : result.ToString();
            }
            catch (Exception)
            {
                throw;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }
    }
}
