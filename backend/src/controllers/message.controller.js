import Message from "../models/message.model.js";
import User from "../models/user.model.js";

import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketID } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const fileteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

        res.status(200).json(fileteredUsers);
    } catch (error) {
        console.log("Error in getUsersForSidebar controller " + error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;
        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }
            ]
        });

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessages controller " + error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }
        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl
        });
        await newMessage.save();

        const receiverSocketId = getReceiverSocketID(receiverId);
        console.log("Aryan123 ", receiverSocketId);

        if (receiverSocketId) {
            console.log("emitting ", newMessage, receiverSocketId);

            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sendMessage controller " + error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}