import { Robot } from "../models/robots.model";
import { RobotsEarnings } from "../models/robots_earnings.model";
import { User, UsersModel } from "../models/users.model";
import moment from "moment-timezone";

export const checkRobotsRewards = async (user: UsersModel) => {
    let robots_ids = user.joined_robots.map((robot) => robot.robot_id);

    let robots = await Robot.findManyByIds(robots_ids);

    for (let robot of robots) {
        const { month_duration } = robot;
        const { joined_at, balance } = user.joined_robots.find((joined_robot) =>
            joined_robot.robot_id.equals(robot._id),
        );
        const last_reward_date = moment(joined_at).add(month_duration, "months");
        const exact_days = last_reward_date.diff(joined_at, "days");

        if (moment().isBefore(last_reward_date)) {
            const daysBetween = [];
            let currentDate = moment(joined_at);
            while (currentDate.isBefore(moment())) {
                daysBetween.push(currentDate.toDate());
                currentDate = currentDate.add(1, "days");
            }

            for (let day of daysBetween) {
                const updated_user = await User.collection.findOne({
                    _id: user._id,
                    "joined_robots.robot_id": robot._id,
                });
                const updated_balance = updated_user.joined_robots.find((r) =>
                    r.robot_id.equals(robot._id),
                ).balance;

                const daily_rewards = (updated_balance * (robot.apy / 100)) / exact_days;

                const reward = {
                    robot_id: robot._id,
                    robot_name: robot.name,
                    user_id: user._id,
                    amount: daily_rewards,
                    date: day,
                };

                try {
                    const existingReward = await RobotsEarnings.collection.findOne({
                        robot_id: robot._id,
                        user_id: user._id,
                        date: day,
                    });

                    if (!existingReward) {
                        const newReward = new RobotsEarnings(reward);
                        await newReward.save();
                        await User.collection.updateOne(
                            { _id: user._id, "joined_robots.robot_id": robot._id },
                            { $inc: { "joined_robots.$.balance": reward.amount } },
                        );
                    } else {
                        console.log(
                            "Duplicate reward for robot: ",
                            robot.name,
                            " and user: ",
                            user.first_name,
                            " on date: ",
                            day,
                        );
                    }
                } catch (e) {
                    console.error("Error inserting reward:", e);
                }
            }
        } else {
            await User.collection.findOneAndUpdate(
                { _id: user._id },
                {
                    $pull: { joined_robots: { robot_id: robot._id } },
                    $inc: { robots_balance: balance },
                },
                { returnDocument: "after" },
            );
        }
    }
};

export const processRobotsRewards = async () => {
    // Get all users who have joined robots
    const users = await User.collection.find({
        "joined_robots.0": { $exists: true },
        role: "client"
    }).toArray();

    console.log(`Processing rewards for ${users.length} users`);

    const results = await Promise.all(
        users.map(async (user) => {
            try {
                await checkRobotsRewards(user);
                return { userId: user._id, success: true };
            } catch (error) {
                console.error(`Error processing rewards for user ${user._id}:`, error);
                return { userId: user._id, success: false, error };
            }
        })
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`Finished processing robot rewards. Success: ${successCount}/${users.length}`);

    return results;
};
