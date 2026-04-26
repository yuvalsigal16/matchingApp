using MatchingAppServer.BL;
using Microsoft.Data.SqlClient;

namespace MatchingAppServer.DAL
{
    public class ToDoListDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // ADD TASK
        public int AddTask(ToDoList task)
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
                { "@TripID", task.TripID },
                { "@UserID", task.UserID },
                { "@TaskText", task.TaskText }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddTask", con, param);

            try
            {
                object result = cmd.ExecuteScalar();
                return Convert.ToInt32(result);
            }
            catch(Exception)
            {
                throw;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        // MARK DONE
        public int MarkTaskDone(int taskID, bool isDone)
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
                { "@TaskID", taskID },
                { "@IsDone", isDone }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("MarkTaskDone", con, param);

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
        public int DeleteTask(int taskID)
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
                { "@TaskID", taskID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("DeleteTask", con, param);

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
        public List<ToDoList> GetTasksByTripID(int tripID)
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

            cmd = CreateCommandWithStoredProcedureGeneral("GetTasksByTripID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                List<ToDoList> list = new();

                while (reader.Read())
                {
                    list.Add(new ToDoList
                    {
                        TaskID = Convert.ToInt32(reader["TaskID"]),
                        TripID = Convert.ToInt32(reader["TripID"]),
                        UserID = Convert.ToInt32(reader["UserID"]),
                        TaskText = reader["TaskText"].ToString(),
                        IsDone = Convert.ToBoolean(reader["IsDone"])
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

        // GET BY USER
        public List<ToDoList> GetTasksByUserID(int userID)
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
                { "@UserID", userID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetTasksByUserID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                List<ToDoList> list = new();

                while (reader.Read())
                {
                    list.Add(new ToDoList
                    {
                        TaskID = Convert.ToInt32(reader["TaskID"]),
                        TripID = Convert.ToInt32(reader["TripID"]),
                        UserID = Convert.ToInt32(reader["UserID"]),
                        TaskText = reader["TaskText"].ToString(),
                        IsDone = Convert.ToBoolean(reader["IsDone"])
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
