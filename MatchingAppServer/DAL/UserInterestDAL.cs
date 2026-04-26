using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;

namespace MatchingAppServer.DAL
{
    public class UserInterestDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        public int Add(int userId, int interestId)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                {"@UserID", userId},
                {"@InterestID", interestId}
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddUserInterest", con, param);

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

        public int Delete(int userId, int interestId)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                {"@UserID", userId},
                {"@InterestID", interestId}
            };

            cmd = CreateCommandWithStoredProcedureGeneral("DeleteUserInterest", con, param);

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

        public List<Interest> GetByUserId(int userId)
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

            cmd = CreateCommandWithStoredProcedureGeneral("GetUserInterests", con, param);

            try
            {
                List<Interest> list = new List<Interest>();

                reader = cmd.ExecuteReader();

                while (reader.Read())
                {
                    list.Add(new Interest
                    {
                        InterestID = Convert.ToInt32(reader["InterestID"]),
                        InterestName = reader["InterestName"].ToString()
                    });
                }

                return list;
            }
            finally
            {
                con.Close();
            }
        }
    }
}
