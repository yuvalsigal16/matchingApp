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

            //יצירת פקודה שמפעילה את הפונקציה הזו ואין לה פרמטרים נדרשים
            cmd = CreateCommandWithStoredProcedureGeneral("GetAllUsers", con, paramDic);
            try
            {
                List<User> users = new List<User>();
                reader = cmd.ExecuteReader(); //קריאת נתונים מהמסד נתונים 
                while (reader.Read()) //מעברי שורה שורה בתוצאות 
                {
                    //user יצירת אובייקט לכל שורה שנקראת  
                    users.Add(new User()
                    {
                        UserID = Convert.ToInt32(reader["UserId"].ToString()), // int המרה מהמסד ל 
                        Email = reader["Email"].ToString(),
                        CreatedAt = Convert.ToDateTime(reader["CreatedAt"])
                    });
                }
                return users;// החזרת כל המשתמשים מהרשימה
            }
            catch (Exception) { throw; }
            finally
            {
                // סגירת החיבור כדי למנוע דליפת משאבים
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
