using MatchingAppServer.BL;
using Microsoft.Data.SqlClient;

namespace MatchingAppServer.DAL
{
    public class TripDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // GET BY USER
        public List<Trip> GetTripsByUserID(int userId)
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

            cmd = CreateCommandWithStoredProcedureGeneral("GetTripsByUserID", con, param);

            try
            {
                List<Trip> list = new List<Trip>();

                reader = cmd.ExecuteReader();

                while (reader.Read())
                {
                    list.Add(new Trip
                    {
                        TripID = Convert.ToInt32(reader["TripID"]),
                        CreatedByUserID = Convert.ToInt32(reader["CreatedByUserID"]),
                        Destination = reader["Destination"].ToString(),
                        StartDate = Convert.ToDateTime(reader["StartDate"]),
                        EndDate = Convert.ToDateTime(reader["EndDate"]),
                        Status = reader["Status"].ToString(),
                        CreatedAt = Convert.ToDateTime(reader["CreatedAt"])
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

        // GET BY ID
        public Trip GetTripById(int tripId)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@TripID", tripId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetTripByID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    return new Trip
                    {
                        TripID = Convert.ToInt32(reader["TripID"]),
                        CreatedByUserID = Convert.ToInt32(reader["CreatedByUserID"]),
                        Destination = reader["Destination"].ToString(),
                        StartDate = Convert.ToDateTime(reader["StartDate"]),
                        EndDate = Convert.ToDateTime(reader["EndDate"]),
                        Status = reader["Status"].ToString(),
                        CreatedAt = Convert.ToDateTime(reader["CreatedAt"])
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

        // ADD
        public int AddTrip(Trip trip)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@CreatedByUserID", trip.CreatedByUserID },
                { "@Destination", trip.Destination },
                { "@StartDate", trip.StartDate },
                { "@EndDate", trip.EndDate }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddTrip", con, param);

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

        // UPDATE
        public int UpdateTrip(Trip trip)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@TripID", trip.TripID },
                { "@Destination", trip.Destination },
                { "@StartDate", trip.StartDate },
                { "@EndDate", trip.EndDate },
                { "@Status", trip.Status }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("UpdateTrip", con, param);

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
        public int DeleteTrip(int tripId)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@TripID", tripId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("DeleteTrip", con, param);

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
    }
}
