using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;

namespace MatchingAppServer.DAL
{
    public class TripParticipantDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // ADD
        public int Add(int tripId, int userId)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }
            var param = new Dictionary<string, object>()
            {
            {"@TripID", tripId},
            {"@UserID", userId}
            };

            cmd = CreateCommandWithStoredProcedureGeneral("dbo.AddTripParticipant", con, param);

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

        // REMOVE
        public int Remove(int tripId, int userId)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
            {"@TripID", tripId},
            {"@UserID", userId}
            };

            cmd = CreateCommandWithStoredProcedureGeneral("dbo.RemoveTripParticipant", con, param);

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


        // GET USERS IN TRIP
        public List<User> GetTripParticipants(int tripId)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                {"@TripID", tripId}
            };

            cmd = CreateCommandWithStoredProcedureGeneral("dbo.GetTripParticipants", con, param);

            try
            {
                List<User> list = new();

                reader = cmd.ExecuteReader();

                while (reader.Read())
                {
                    list.Add(new User
                    {
                        UserID = Convert.ToInt32(reader["UserID"]),
                        Email = reader["Email"].ToString(),
                        ProfileImage = reader["ProfileImage"].ToString()
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

