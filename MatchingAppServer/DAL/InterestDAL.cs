using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;

namespace MatchingAppServer.DAL
{
    public class InterestDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        public List<Interest> GetAll()
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            cmd = CreateCommandWithStoredProcedureGeneral("GetAllInterests", con, null);

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

        public int Add(Interest interest)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                {"@InterestName", interest.InterestName}
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddInterest", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                    return Convert.ToInt32(reader["InterestID"]);

                return -1;
            }
            finally
            {
                con.Close();
            }
        }
    }
}
