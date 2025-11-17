// Service is used for http requests, retreiving the data
import axios from "axios";

let API_URL = "";
if (!import.meta.env.PROD) {
  API_URL = "http://localhost:5000/api/"; // lets us use the backend server in local development
}
else {
  API_URL = "/api/";
}

interface UserType {
  id: number;
  username: string;
  role: string;
  token: string;
  message: string;
}

// Login Users
const login = async (userData: object): Promise<UserType> => {
  try {
    const { data } = await axios.post(API_URL + "admin/login", userData);
    if (data.username) {
      localStorage.setItem("user", JSON.stringify(data));
      return data;
    }
    return data.message;
  } catch (error) {
    console.log("error from AuthService: ", error);
    throw error;
  }
};


//logout CHANGE THIS TO HTTP ONLY COOKIE
const logout = () => {
  localStorage.removeItem("user");
};

const authService = {
  login,
  logout,
};

export default authService;
