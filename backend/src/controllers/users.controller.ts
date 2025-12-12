import { Request, Response } from "express";
import { User } from "../models/users.model";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { Position } from "../models/positions.model";
import { RobotsEarnings } from "../models/robots_earnings.model";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.findAllClients();
    return res.json(users);
  } catch (error) {
    return res.status(400).json({ error: "error" });
  }
};

export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const users = await User.findAllAdmins();
    return res.json(users);
  } catch (error) {
    return res.status(400).json({ error: "error" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await User.findOneById(new ObjectId(id));
    return res.json({ success: true, data: user });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const updateUserBalance = async (req: Request, res: Response) => {
  try {
    const { currency } = req.params;
    const { user_id, amount } = req.body;
    console.log({ user_id, currency, amount });
    if (amount > 0) {
      await User.collection.findOneAndUpdate(
        { _id: new ObjectId(user_id as string) },
        {
          $push: {
            deposits: {
              _id: new ObjectId(),
              amount: parseFloat(amount),
              symbol: currency,
              date: new Date(),
              status: "approved",
            },
          },
        }
      );
    }
    const result = await User.updateBalance(
      new ObjectId(user_id as string),
      currency,
      parseFloat(amount)
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const updateUserRobotBalance = async (req: Request, res: Response) => {
  try {
    const { user_id, amount } = req.body;
    const result = await User.updateRobotBalance(
      new ObjectId(user_id as string),
      parseFloat(amount)
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const updateUserInvestBalance = async (req: Request, res: Response) => {
  try {
    const { user_id, amount } = req.body;
    const result = await User.updateInvestBalance(
      new ObjectId(user_id as string),
      parseFloat(amount)
    );

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const createUserBalance = async (req: Request, res: Response) => {
  try {
    const { user_id, currency, amount, name } = req.body;

    const result = await User.createBalance(
      new ObjectId(user_id as string),
      currency,
      amount,
      name
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const updateUserAdmin = async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body;
  try {
    const result = await User.updateById(new ObjectId(id), payload);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const updateUserInfos = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    first_name,
    last_name,
    phone,
    email,
    address,
    password,
    custom_message,
    fee_percentage,
    max_leverage,
  } = req.body;
  try {
    const payload: any = {
      first_name,
      last_name,
      phone,
      email,
      address,
      custom_message,
      fee_percentage: fee_percentage !== undefined ? parseFloat(fee_percentage) : undefined,
      max_leverage: max_leverage !== undefined ? parseFloat(max_leverage) : undefined,
    };
    if (password && password.length > 0) {
      payload.password = password;
    }
    const updateToken = ["superadmin"].includes(req.user.role);
    const result = await User.updateById(
      new ObjectId(id),
      payload,
      updateToken
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const updateUserPassword = async (req: Request, res: Response) => {
  const { _id } = req.user;
  const { password } = req.body;
  try {
    const payload = { password };
    if (password && password.length > 0) {
      // const hashed_password = await bcrypt.hash(password, 10);
      // payload.password = hashed_password;
      payload.password = password;
    }
    const result = await User.updateById(new ObjectId(_id), payload);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const user_id = req.user._id;
  const payload = req.body;
  try {
    const result = await User.updateById(new ObjectId(user_id), payload);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const adminGetAllDepositsAndWithdraws = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await User.findAllDepositsAndWithdraws();
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const requestDeposit = async (req: Request, res: Response) => {
  const user_id = req.user._id;
  const { amount, symbol } = req.body;
  try {
    const result = await User.collection.findOneAndUpdate(
      {
        _id: new ObjectId(user_id),
      },
      {
        $push: {
          deposits: {
            _id: new ObjectId(),
            amount: parseFloat(amount),
            symbol,
            date: new Date(),
            status: "pending",
          },
        },
      },
      {
        returnDocument: "after",
      }
    );
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const requestWithdraw = async (req: Request, res: Response) => {
  const user_id = req.user._id;
  const { amount, symbol } = req.body;
  try {
    const result = await User.collection.findOneAndUpdate(
      {
        _id: new ObjectId(user_id),
        "balances.symbol": symbol,
      },
      {
        $inc: {
          "balances.$.balance": -parseFloat(amount),
        },
        $push: {
          withdraws: {
            _id: new ObjectId(),
            amount: parseFloat(amount),
            symbol,
            date: new Date(),
            status: "pending",
          },
        },
      },
      {
        returnDocument: "after",
      }
    );
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const adminApproveDeposit = async (req: Request, res: Response) => {
  const { user_id, deposit_id } = req.body;
  try {
    const user = await User.collection.findOne({
      _id: new ObjectId(user_id as string),
    });
    const deposit = user.deposits.find(
      (d: any) => d._id.toString() === deposit_id
    );
    if (!deposit) {
      return res.status(400).json({ message: "Deposit not found" });
    }

    const result = await User.collection.findOneAndUpdate(
      {
        _id: new ObjectId(user_id as string),
        "deposits._id": new ObjectId(deposit_id as string),
      },
      {
        $set: {
          "deposits.$.status": "approved",
        },
        $inc: {
          "balances.$[element].balance": deposit.amount,
        },
      },
      {
        arrayFilters: [{ "element.symbol": deposit.symbol }],
        returnDocument: "after",
      }
    );
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const adminApproveWithdraw = async (req: Request, res: Response) => {
  const { user_id, withdraw_id } = req.body;
  try {
    const user = await User.collection.findOne({
      _id: new ObjectId(user_id as string),
    });
    const withdraw = user.withdraws.find(
      (d: any) => d._id.toString() === withdraw_id
    );
    if (!withdraw) {
      return res.status(400).json({ message: "Withdraw not found" });
    }

    const result = await User.collection.findOneAndUpdate(
      {
        _id: new ObjectId(user_id as string),
        "withdraws._id": new ObjectId(withdraw_id as string),
      },
      {
        $set: {
          "withdraws.$.status": "approved",
        },
      },
      {
        returnDocument: "after",
      }
    );
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const adminCancelDeposit = async (req: Request, res: Response) => {
  const { user_id, deposit_id } = req.body;
  try {
    const user = await User.collection.findOne({
      _id: new ObjectId(user_id as string),
    });
    const deposit = user.deposits.find(
      (d: any) => d._id.toString() === deposit_id
    );
    if (!deposit) {
      return res.status(400).json({ message: "Deposit not found" });
    }

    const result = await User.collection.findOneAndUpdate(
      {
        _id: new ObjectId(user_id as string),
        "deposits._id": new ObjectId(deposit_id as string),
      },
      {
        $set: {
          "deposits.$.status": "canceled",
        },
      },
      {
        returnDocument: "after",
      }
    );
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const adminCancelWithdraw = async (req: Request, res: Response) => {
  const { user_id, withdraw_id } = req.body;
  try {
    const user = await User.collection.findOne({
      _id: new ObjectId(user_id as string),
    });
    const withdraw = user.withdraws.find(
      (d: any) => d._id.toString() === withdraw_id
    );
    if (!withdraw) {
      return res.status(400).json({ message: "Withdraw not found" });
    }
    const symbol = withdraw.symbol;

    const result = await User.collection.findOneAndUpdate(
      {
        _id: new ObjectId(user_id as string),
        "withdraws._id": new ObjectId(withdraw_id as string),
      },
      {
        $inc: {
          "balances.$[element].balance": withdraw.amount,
        },
        $set: {
          "withdraws.$.status": "canceled",
        },
      },
      {
        returnDocument: "after",
        arrayFilters: [{ "element.symbol": symbol }],
      }
    );
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const adminDeclineDeposit = async (req: Request, res: Response) => {
  const { user_id, deposit_id } = req.body;
  try {
    const user = await User.collection.findOne({
      _id: new ObjectId(user_id as string),
    });
    const deposit = user.deposits.find(
      (d: any) => d._id.toString() === deposit_id
    );
    if (!deposit) {
      return res.status(400).json({ message: "Deposit not found" });
    }

    const result = await User.collection.findOneAndUpdate(
      {
        _id: new ObjectId(user_id as string),
        "deposits._id": new ObjectId(deposit_id as string),
      },
      {
        $set: {
          "deposits.$.status": "declined",
        },
      },
      {
        returnDocument: "after",
      }
    );
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const adminDeclineWithdraw = async (req: Request, res: Response) => {
  const { user_id, withdraw_id } = req.body;
  try {
    const user = await User.collection.findOne({
      _id: new ObjectId(user_id as string),
    });
    const withdraw = user.withdraws.find(
      (d: any) => d._id.toString() === withdraw_id
    );
    if (!withdraw) {
      return res.status(400).json({ message: "Withdraw not found" });
    }
    const symbol = withdraw.symbol;

    const result = await User.collection.findOneAndUpdate(
      {
        _id: new ObjectId(user_id as string),
        "withdraws._id": new ObjectId(withdraw_id as string),
      },
      {
        $inc: {
          "balances.$[element].balance": withdraw.amount,
        },
        $set: {
          "withdraws.$.status": "declined",
        },
      },
      {
        returnDocument: "after",
        arrayFilters: [{ "element.symbol": symbol }],
      }
    );
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const adminDeleteDeposit = async (req: Request, res: Response) => {
  const { user_id, deposit_id } = req.body;
  try {
      const result = await User.collection.findOneAndUpdate(
          {
              _id: new ObjectId(user_id as string),
          },
          {
              $pull: {
                  deposits: {
                      _id: new ObjectId(deposit_id as string),
                  },
              },
          },
          {
              returnDocument: 'after',
          },
      );
      return res.json({ success: true, data: result });
  } catch (err: any) {
      return res.status(400).json({ message: err.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await User.deleteById(new ObjectId(id));
    await Position.collection.deleteMany({ user_id: new ObjectId(id) });
    await RobotsEarnings.collection.deleteMany({ user_id: new ObjectId(id) });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  const { from, to, message } = req.body;

  try {
    if (to === "admin") {
      const superadmin = await User.collection.findOne({
        role: "superadmin",
      });
      if (!superadmin) {
        return res.status(400).json({ message: "No superadmin" });
      }

      const newMessage = {
        _id: new ObjectId(),
        from: new ObjectId(from as string),
        to: superadmin._id,
        message,
        date: new Date(),
        is_opened: false,
      };

      await User.collection.updateMany(
        {
          _id: {
            $in: [new ObjectId(from as string), superadmin._id],
          },
        },
        {
          $push: {
            messages: newMessage,
          },
        }
      );
      return res.json({ success: true, data: newMessage });
    }
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const clearChat = async (req: Request, res: Response) => {
  const { user_id } = req.body;
  try {
    const user = await User.findOneById(new ObjectId(user_id as string));
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const superadmin = await User.collection.findOne({
      role: "superadmin",
    });
    if (!superadmin) {
      return res.status(400).json({ message: "No superadmin" });
    }

    const newMessages = superadmin.messages.filter(
      (m: any) => m.from.toString() !== user_id
    );
    await User.collection.updateOne(
      { _id: superadmin._id },
      {
        $set: {
          messages: newMessages,
        },
      }
    );

    const result = await User.collection.updateOne(
      { _id: new ObjectId(user_id as string) },
      { $set: { messages: [] } }
    );

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const setMessageAsOpened = async (req: Request, res: Response) => {
  const { user_id } = req.body;

  try {
    const result = await User.collection.updateOne(
      { _id: new ObjectId(user_id as string) },
      { $set: { "messages.$[].is_opened": true } }
    );

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};
