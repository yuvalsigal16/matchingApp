using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;

namespace MatchingAppServer.DAL
{
    public class RecommendationDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // ADD
        public int AddRecommendation(Recommendation rec)
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
                { "@UserID", rec.UserID },
                { "@TripID", rec.TripID },
                { "@PlaceName", rec.PlaceName },
                { "@Description", rec.Description },
                { "@Rating", rec.Rating },
                { "@MediaUrl", rec.MediaUrl },
                { "@IsAnonymous", rec.IsAnonymous }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddRecommendation", con, param);

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
        public int UpdateRecommendation(Recommendation rec)
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
                { "@RecommendationID", rec.RecommendationID },
                { "@PlaceName", rec.PlaceName },
                { "@Description", rec.Description },
                { "@Rating", rec.Rating },
                { "@MediaUrl", rec.MediaUrl },
                { "@IsAnonymous", rec.IsAnonymous }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("UpdateRecommendation", con, param);

            try
            {
                return cmd.ExecuteNonQuery();
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
        public int DeleteRecommendation(int id)
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
                { "@RecommendationID", id }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("DeleteRecommendation", con, param);

            try
            {
                return cmd.ExecuteNonQuery();
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

        // GET BY TRIP
        public List<Recommendation> GetByTripID(int tripID)
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
                { "@TripID", tripID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetRecommendationsByTripID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                List<Recommendation> list = new();

                while (reader.Read())
                {
                    list.Add(new Recommendation
                    {
                        RecommendationID = Convert.ToInt32(reader["RecommendationID"]),
                        UserID = Convert.ToInt32(reader["UserID"]),
                        TripID = Convert.ToInt32(reader["TripID"]),
                        PlaceName = reader["PlaceName"].ToString(),
                        Description = reader["Description"].ToString(),
                        Rating = reader["Rating"] == DBNull.Value ? null : Convert.ToByte(reader["Rating"]),
                        MediaUrl = reader["MediaUrl"].ToString(),
                        IsAnonymous = Convert.ToBoolean(reader["IsAnonymous"])
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
