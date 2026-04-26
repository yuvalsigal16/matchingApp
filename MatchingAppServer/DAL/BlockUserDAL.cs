using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;
namespace MatchingAppServer.DAL
{
    public class BlockUserDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // BLOCK USER
        public int BlockUser(int userId, int blockedUserId)
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
                { "@UserID", userId },
                { "@BlockedUserID", blockedUserId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("BlockUser", con, paramDic);

            try
            {
                int rows = cmd.ExecuteNonQuery();
                return rows;
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

        // UNBLOCK USER
        public int UnblockUser(int userId, int blockedUserId)
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
                { "@UserID", userId },
                { "@BlockedUserID", blockedUserId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("UnblockUser", con, paramDic);

            try
            {
                int rows = cmd.ExecuteNonQuery();
                return rows;
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

        // GET BLOCKED USERS
        public List<BlockUser> GetBlockedUsers(int userId)
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
                { "@UserID", userId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetBlockedUsers", con, paramDic);

            try
            {
                List<BlockUser> list = new List<BlockUser>();
                reader = cmd.ExecuteReader();

                while (reader.Read())
                {
                    list.Add(new BlockUser()
                    {
                        BlockID = Convert.ToInt32(reader["BlockID"]),
                        BlockedUserID = Convert.ToInt32(reader["BlockedUserID"]),
                        FirstName = reader["FirstName"]?.ToString(),
                        LastName = reader["LastName"]?.ToString(),
                        ProfileImage = reader["ProfileImage"]?.ToString(),
                        BlockedAt = Convert.ToDateTime(reader["BlockedAt"])
                    });
                }

                return list;
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
