import { MongoClient } from "mongodb";
import config from "../config/config";

const client = new MongoClient(config.mongo_uri);
export const db = client.db(config.mongo_db_name);
