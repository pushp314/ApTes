import db from 'mongoose';

export const unsafeQuery = (queryData) => {
  // Sink!
  db.connection.db.execute(queryData);
};
