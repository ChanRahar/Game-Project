import axios from "axios";

// The getBooks method retrieves recipes from the server
// It accepts a "query" or term to search the recipe api for
export default {
  // Saves a user to the database
  signUp: (userData) => {
    return axios.post("/api/signup", userData);
  },

  login: (userData) => {
    return axios.post("/api/login", userData);
  },

  signedIn: () => {
    return axios.get("/api/user_data")
  },

  logout: () => {
    return axios.get("/api/logout")
  },

  // Gets all users
  getAllUsers: () => {
    return axios.get("/api/allUsers");
  },
  // Gets the users with the given username
  getUser: function (id) {
    return axios.get("/api/allUsers/" + id);
  },
  updateUser: function (id, win) {
    return axios.put("/api/allUsers/" + id, win);
  },

  passReset: function (username, email, userData) {
    return axios.put(`/api/allUsers/${username}/${email}`, userData);
  },

};
