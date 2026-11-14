// Rooms are NOT the floors of takepos/fapi/tables.php. In the classic POS (takeposnew/api/tables.php?action=getRooms) a room is a hotel
// room with a booking in check-in status (booking_rooms.room_status = 'checkin' joined to room_list, with the booking's customer_id), and
// the view only exists when the Hotel module is on and the user has Front Desk / Room Service rights. tables.php returns restaurant floors
// and tables only, so there is still no JSON source for rooms: this throws and the UI shows a "not available" state instead of floors
// passed off as rooms. Wire it here when an endpoint for checked-in rooms exists.

export const FLOOR_COUNT = 0;
export const ROOMS_PER_ROW = 7;

export const fetchRooms = async () => {
    throw new Error("Rooms are not available here: the room list is the hotel rooms that are checked in, and the POS tables API returns restaurant floors and tables only.");
};

export const saveRoomStatuses = async () => {
    throw new Error("No backend endpoint exists for saving room statuses");
};
