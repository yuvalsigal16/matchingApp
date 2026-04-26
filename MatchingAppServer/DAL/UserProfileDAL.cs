using MatchingAppServer.BL;
using Microsoft.Data.SqlClient;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace MatchingAppServer.DAL
{
    public class UserProfileDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        public List<UserProfile> GetAllUserProfiles()
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            cmd = CreateCommandWithStoredProcedureGeneral("GetAllUserProfiles", con, null);

            try
            {
                List<UserProfile> list = new List<UserProfile>();

                reader = cmd.ExecuteReader();

                while (reader.Read())
                {
                    list.Add(new UserProfile
                    {
                        ProfileID = Convert.ToInt32(reader["ProfileID"]),
                        UserID = Convert.ToInt32(reader["UserID"]),
                        FirstName = reader["FirstName"].ToString(),
                        LastName = reader["LastName"].ToString(),
                        BirthDate = Convert.ToDateTime(reader["BirthDate"]),
                        Gender = reader["Gender"]?.ToString(),
                        City = reader["City"]?.ToString(),
                        ProfileImage = reader["ProfileImage"]?.ToString(),
                        LastUpdated = Convert.ToDateTime(reader["LastUpdated"])
                    });
                }

                return list;
            }
            finally
            {
                con.Close();
            }
        }


        // GET BY USER ID
        public UserProfile GetByUserId(int userId)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                {"@UserID", userId}
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetUserProfileByUserID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    return new UserProfile
                    {
                        ProfileID = Convert.ToInt32(reader["ProfileID"]),
                        UserID = Convert.ToInt32(reader["UserID"]),
                        FirstName = reader["FirstName"].ToString(),
                        LastName = reader["LastName"].ToString(),
                        BirthDate = Convert.ToDateTime(reader["BirthDate"]),
                        Gender = reader["Gender"]?.ToString(),
                        City = reader["City"]?.ToString(),
                        ProfileImage = reader["ProfileImage"]?.ToString(),
                        LastUpdated = Convert.ToDateTime(reader["LastUpdated"])
                    };
                }

                return null;
            }
            finally
            {
                con.Close();
            }
        }

        // ADD
        public int AddProfile(UserProfile profile)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                {"@UserID", profile.UserID},
                {"@FirstName", profile.FirstName},
                {"@LastName", profile.LastName},
                {"@BirthDate", profile.BirthDate},
                {"@Gender", profile.Gender},
                {"@City", profile.City},
                {"@ProfileImage", profile.ProfileImage}
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddUserProfile", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                    return Convert.ToInt32(reader["ProfileID"]);

                return -1;
            }
            finally
            {
                con.Close();
            }
        }

        // UPDATE
        public int UpdateProfile(UserProfile profile)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                {"@UserID", profile.UserID},
                {"@FirstName", profile.FirstName},
                {"@LastName", profile.LastName},
                {"@BirthDate", profile.BirthDate},
                {"@Gender", profile.Gender},
                {"@City", profile.City},
                {"@ProfileImage", profile.ProfileImage}
            };

            cmd = CreateCommandWithStoredProcedureGeneral("UpdateUserProfile", con, param);

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

        // UPDATE PROFILE IMAGE
        public int UpdateProfileImage(int userId, string filePath)
        {
            try
            {
                con = connect();
            }
            catch (Exception)
            {
                throw;
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>()
            {
                { "@UserID", userId },
                { "@ProfileImage", filePath }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("UpdateUserProfileImage", con, paramDic);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                    return Convert.ToInt32(reader["RowsAffected"]);

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

        // DELETE PROFILE IMAGE
        public int DeleteProfileImage(int userId)
        {
            try
            {
                con = connect();
            }
            catch (Exception)
            {
                throw;
            }

            Dictionary<string, object> paramDic = new()
            {
                { "@UserID", userId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("DeleteUserProfileImage", con, paramDic);

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
                con?.Close();
            }
        }

        // GET USER PROFILE IMAGE BY USER ID
        public string GetUserProfileImageByUserId(int userId)
        {
            try
            {
                con = connect();
            }
            catch (Exception)
            {
                throw;
            }

            var param = new Dictionary<string, object>()
            {
                { "@UserID", userId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetUserProfileImageByUserID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    return reader["ProfileImage"]?.ToString();
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


    }
}
