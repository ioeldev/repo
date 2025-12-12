require("dotenv").config();

import { User } from "../models/users.model";

(async () => {
  const user = new User({
    email: "admin@gmail.com",
    password: "1234",
    first_name: "Admin",
    last_name: "Gmail",
    address: {
      country: "France",
      city: "Paris",
      address: "Rue 1",
      postal_code: "75000",
    },
    phone: "0606060606",
    role: "superadmin",
    balances: [
      {
        name: "Bitcoin",
        symbol: "BTC",
        balance: 0,
      },
      {
        name: "Tether",
        symbol: "USDT",
        balance: 0,
      },
    ],
    robots_balance: 0,
    invest_balance: 0,
    joined_products: [],
    invest_requests: [],
    deposits: [],
    withdraws: [],
    joined_robots: [],
    robots_requests: [],
    risk_level: 0,
    tokenVersion: 0,
    messages: [],
  });

  await user.save();

  console.log("User added successfully");
})();
