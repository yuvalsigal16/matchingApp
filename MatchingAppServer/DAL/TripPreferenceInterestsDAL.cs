using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;

namespace MatchingAppServer.DAL
{
    public class TripPreferenceInterestsDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // ADD
        public int Add(int tripPreferenceID, int interestID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@TripPreferenceID", tripPreferenceID },
                { "@InterestID", interestID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddTripPreferenceInterest", con, param);

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

        // DELETE
        public int Delete(int tripPreferenceID, int interestID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@TripPreferenceID", tripPreferenceID },
                { "@InterestID", interestID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("DeleteTripPreferenceInterest", con, param);

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

        // GET INTERESTS BY TRIP PREFERENCE
        public List<Interest> GetByTripPreferenceID(int tripPreferenceID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@TripPreferenceID", tripPreferenceID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetTripPreferenceInterests", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                List<Interest> list = new List<Interest>();

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
