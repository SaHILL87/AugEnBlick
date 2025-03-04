import { Types } from "mongoose";
import Document from "../models/document.models";
import { User } from "../models/user.models";
import { ErrorHandler } from "../lib/ErrorHandler";

const defaultData = "";

/**
 * Fetch all documents where the user is either the owner or a collaborator.
 * @param userId - The ID of the user.
 * @returns A promise resolving to the list of documents.
 */
export const getAllDocuments = async (userId: string) => {
    try {
      const documents = await Document.find({
        $or: [
          { owner: new Types.ObjectId(userId) },
          { "collaborators.userId": new Types.ObjectId(userId) },
        ],
      }).populate("owner", "username email") // Populate owner details
        .populate("collaborators.userId", "username email"); // Populate collaborators
  
      return documents;
    } catch (error) {
        throw new ErrorHandler(500, "Error fetching documents");
    }
  };
  

export const findOrCreateDocument = async({ documentId, documentName,userId }: { documentId: string, documentName: string , userId:string }) => {
    if(!documentId){
        return ;
    }   
    const document = await Document.findById(documentId) ;
    if(document){
        return document ;
    }

    const user = await User.findById(userId);

    if(!user){
        return ;
    }

    const newDocument = await Document.create({ _id: documentId, name: documentName , data: defaultData , owner: user._id });

    user.docs.push(newDocument._id) ;
    await user.save() ;
    
    return newDocument ;
}

export const updateDocument = async(id: string, data: Object) => {
    if(!id){
        return ;
    }
    await Document.findByIdAndUpdate(id, data) ;
}


/**
 * Check if a user is the owner or a collaborator of a document.
 * @param userId - The ID of the user.
 * @param documentId - The ID of the document.
 * @returns A promise resolving to true if the user is an owner or collaborator, otherwise false.
 */
export const isUserAuthorized = async (userId: string, documentId: string): Promise<boolean> => {
    try {
      // Determine if userId and documentId should be treated as ObjectId or String
      const userIdQuery = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
      const documentIdQuery = Types.ObjectId.isValid(documentId) ? new Types.ObjectId(documentId) : documentId;
  
      const result = await Document.aggregate([
        {
          $match: {
            _id: documentIdQuery,
            $or: [
              { owner: userIdQuery },
              { "collaborators.userId": userIdQuery },
            ],
          },
        },
        {
          $project: { _id: 1 }, // Only project _id if match found
        },
      ]);
  
      return result.length > 0;
    } catch (error) {
      throw new Error(`Error checking user authorization: ${error}`);
    }
  };