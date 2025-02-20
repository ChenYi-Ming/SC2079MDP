import React, { useState, useEffect} from "react";
import QueryAPI from "./QueryAPI";

// Constants for directions
const Direction = {
  NORTH: 0,
  EAST: 2,
  SOUTH: 4,
  WEST: 6,
  SKIP: 8,
};

const ObDirection = {
  NORTH: 0,
  EAST: 2,
  SOUTH: 4,
  WEST: 6,
  SKIP: 8,
};

const DirectionToString = {
  0: "Up",
  2: "Right",
  4: "Down",
  6: "Left",
  8: "None",
};


/**
 * Converts coordinates from the (0, 0) top-left system to a (0, 0) bottom-left system.
 * 
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @returns {Object} The transformed coordinates.
 */
const transformCoord = (x, y) => {
  return { x: 19 - y, y: x };
};

/**
 * Joins class names together.
 * 
 * @param  {...string} classes - The class names to join.
 * @returns {string} The combined class name string.
 */
function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * The Simulator component manages the state and UI for simulating a robot moving through a grid.
 */
export default function Simulator() {
  const [robotState, setRobotState] = useState({
    x: 1,
    y: 1,
    d: Direction.NORTH,
    s: -1,
  });
  const [robotX, setRobotX] = useState(1);
  const [robotY, setRobotY] = useState(1);
  const [robotDir, setRobotDir] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [obXInput, setObXInput] = useState(0);
  const [obYInput, setObYInput] = useState(0);
  const [directionInput, setDirectionInput] = useState(ObDirection.NORTH);
  const [isComputing, setIsComputing] = useState(false);
  const [path, setPath] = useState([]);
  const [commands, setCommands] = useState([]);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState('State');  // New state for tab management
  const [isAnimating, setIsAnimating] = useState(false);  // Track if robot is animating
  const [cumulativeRotation, setCumulativeRotation] = useState(0);
  const [previousPage, setPreviousPage] = useState(0);
  /**
  * Generates a unique ID for new obstacles.
  * 
  * @returns {number} A unique ID.
  */
 const generateNewID = () => {
   while (true) {
     let new_id = Math.floor(Math.random() * 10) + 1; // Try to generate an ID
     let ok = true;
     for (const ob of obstacles) {
       if (ob.id === new_id) { // Check if ID already exists
         ok = false;
         break;
       }
     }
     if (ok) {
       return new_id; // Return unique ID
     }
   }
 };

 /**
   * Generates the cells occupied by the robot based on its current state.
   * 
   * @returns {Array} An array of robot cell objects.
   */
 const generateRobotCells = () => {
  const robotCells = [];
  let markerX = 0;
  let markerY = 0;

  // Determine marker position based on robot direction
  if (Number(robotState.d) === Direction.NORTH) {
    markerY++;
  } else if (Number(robotState.d) === Direction.EAST) {
    markerX++;
  } else if (Number(robotState.d) === Direction.SOUTH) {
    markerY--;
  } else if (Number(robotState.d) === Direction.WEST) {
    markerX--;
  }

  // Generate cells for the robot's 3x3 grid
  for (let i = -1; i < 2; i++) {
    for (let j = -1; j < 2; j++) {
      const coord = transformCoord(robotState.x + i, robotState.y + j);
      if (markerX === i && markerY === j) {
        robotCells.push({
          x: coord.x,
          y: coord.y,
          d: robotState.d,
          s: robotState.s,
        });
      } else {
        robotCells.push({
          x: coord.x,
          y: coord.y,
          d: null,
          s: -1,
        });
      }
    }
  }

  return robotCells;
};

// Functions to handle obstacle X and Y input changes
const onChangeX = (event) => {
  if (Number.isInteger(Number(event.target.value))) {
    const nb = Number(event.target.value);
    if (0 <= nb && nb < 20) {
      setObXInput(nb);
      return;
    }
  }
  setObXInput(0);
};

const onChangeY = (event) => {
  if (Number.isInteger(Number(event.target.value))) {
    const nb = Number(event.target.value);
    if (0 <= nb && nb <= 19) {
      setObYInput(nb);
      return;
    }
  }
  setObYInput(0);
};

// Functions to handle robot X and Y input changes
const onChangeRobotX = (event) => {
  if (Number.isInteger(Number(event.target.value))) {
    const nb = Number(event.target.value);
    if (1 <= nb && nb < 19) {
      setRobotX(nb);
      return;
    }
  }
  setRobotX(1);
};

const onChangeRobotY = (event) => {
  if (Number.isInteger(Number(event.target.value))) {
    const nb = Number(event.target.value);
    if (1 <= nb && nb < 19) {
      setRobotY(nb);
      return;
    }
  }
  setRobotY(1);
};

// Add a new obstacle to the grid
const onClickObstacle = () => {
  if (!obXInput && !obYInput) return;
  const newObstacles = [...obstacles];
  newObstacles.push({
    x: obXInput,
    y: obYInput,
    d: directionInput,
    id: generateNewID(),
  });
  setObstacles(newObstacles);
};

// Set the robot state based on input values
const onClickRobot = () => {
  setRobotState({ x: robotX, y: robotY, d: robotDir, s: -1 });
};

// Handle changes in direction for obstacles
const onDirectionInputChange = (event) => {
  setDirectionInput(Number(event.target.value));
};

// Handle changes in direction for the robot
const onRobotDirectionInputChange = (event) => {
  setRobotDir(event.target.value);
};

// Remove a specific obstacle from the grid
const onRemoveObstacle = (ob) => {
  if (path.length > 0 || isComputing) return;
  const newObstacles = [];
  for (const o of obstacles) {
    if (o.x === ob.x && o.y === ob.y) continue;
    newObstacles.push(o);
  }
  setObstacles(newObstacles);
};

// Compute the path and commands for the robot based on the current state
const compute = () => {
  setIsComputing(true);
  QueryAPI.query(obstacles, robotX, robotY, robotDir, (data, err) => {
    if (data) {
      setPath(data.data.data.path);
      const commands = [];
      for (let x of data.data.data.commands) {
        if (!x.startsWith("SNAP")) {
          commands.push(x);
        }
      }
      setCommands(commands);
    }
    setIsComputing(false);
  });
};

// Reset all the states, including obstacles
const onResetAll = () => {
  setRobotX(1);
  setRobotDir(0);
  setRobotY(1);
  setRobotState({ x: 1, y: 1, d: Direction.NORTH, s: -1 });
  setPath([]);
  setCommands([]);
  setPage(0);
  setObstacles([]);
  setIsAnimating(false);  // Stop the animation
  setPage(0);             // Reset to the first page
  setCumulativeRotation(0); // Reset the rotation
  setRobotState({ x: 1, y: 1, d: Direction.NORTH, s: -1 }); // Reset robot's position and direction
};

// Reset the robot's state, excluding obstacles
const onReset = () => {
  setRobotX(1);
  setRobotDir(0);
  setRobotY(1);
  setRobotState({ x: 1, y: 1, d: Direction.NORTH, s: -1 });
  setPage(0);
  setIsAnimating(false);  // Stop the animation
  setPage(0);             // Reset to the first page
  setCumulativeRotation(0); // Reset the rotation
  setRobotState({ x: 1, y: 1, d: Direction.NORTH, s: -1 }); // Reset robot's position and direction
};

// Animate robot movement when switching to the Animation tab
useEffect(() => {
  if (activeTab === "Animation" && path.length > 0) {
    let step = page;

    const animateRobot = () => {
      if (step < path.length) {
        setRobotState(path[step]);  // Move robot to the next step in the path
        if (step < commands.length - 1){
          setPage((prevPage) => prevPage + 1);          
        }
        step++;
        setTimeout(animateRobot, 1000);  // Move every 1 second
      } else {
        setIsAnimating(false);  // Animation complete
      }
    };
    animateRobot();  // Start animation
  }

}, [activeTab, path]);

  // Update the previous page whenever the page changes
useEffect(() => {
  setPreviousPage(page);
}, [page]);

useEffect(() => {
  if (commands.length > 0 && page < commands.length) {
    let currentCommand; // Declare the variable outside the if-else block
    const isReversing = page < previousPage;  // Check if the robot is moving backwards
    if (page > 0) {
      currentCommand = commands[page - 1]; // Set the command to the previous one if page > 0
    } else {
      currentCommand = commands[0]; // Set the command to the first one if page is 0
    }

    const rotationChange = getRotationDegrees(currentCommand, isReversing);
    // console.log("Rotation change: ",rotationChange)
    // Update cumulative rotation, ensuring the new rotation is within 0-360 degrees
    setCumulativeRotation((prevRotation) => (prevRotation + rotationChange) % 360);
    // console.log("Cumulative Rotation change: ",cumulativeRotation)
  }
}, [page, commands]);

//Render the grid
const renderGrid = () => {
  // Initialize the empty rows array
  const rows = [];

  const baseStyle = {
    width: 25,
    height: 25,
    borderStyle: "solid",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 0,
  };

  // Generate the grid
  for (let i = 0; i < 20; i++) {
    const cells = [
      // Header cells
      <td key={i} className="w-8 h-8 md:w-12 md:h-12">
        <span className="text-[#037a76] font-bold text-[0.6rem] md:text-base">
          {19 - i}
        </span>
      </td>,
    ];

    for (let j = 0; j < 20; j++) {
      let foundOb = null;

      // Check for obstacles at the current grid position
      for (const ob of obstacles) {
        const transformed = transformCoord(ob.x, ob.y);
        if (transformed.x === i && transformed.y === j) {
          foundOb = ob;
          break;
        }
      }

      // image for obstacles URL
      const obstacleImageUrl = "/ob.jpg";

      if (foundOb) {
        // Determine rotation angle based on direction
        const rotationAngle =
          foundOb.d === Direction.WEST
            ? "-rotate-90" // Rotate -90° for west
            : foundOb.d === Direction.SOUTH
            ? "rotate-180" // Rotate 180° for south
            : foundOb.d === Direction.EAST
            ? "rotate-90" // Rotate 90° for east
            : ""; // No rotation for north (default)

        // Push the cell with both the border and image
        cells.push(
          <td className={`border w-8 h-8 md:w-12 md:h-12 bg-[#037a76] relative`}>
            {/* Image inside the cell */}
            <img
              src={obstacleImageUrl}
              alt="obstacle"
              className={`absolute inset-0 w-full h-full object-cover ${rotationAngle}`}
            />

            {/* Direction-specific red rectangle */}
            {foundOb.d === Direction.WEST && (
              <div className="absolute inset-y-0 left-0 w-2 bg-[#f44786]" />
            )}
            {foundOb.d === Direction.EAST && (
              <div className="absolute inset-y-0 right-0 w-2 bg-[#f44786]" />
            )}
            {foundOb.d === Direction.NORTH && (
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#f44786]" />
            )}
            {foundOb.d === Direction.SOUTH && (
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-[#f44786]" />
            )}
          </td>
        );
        }

      else {
        cells.push(
          <td className="border-[#037a76] border w-8 h-8 md:w-12 md:h-12 bg-[#f4ebed]" />
        );
      }
    }

    rows.push(<tr key={19 - i}>{cells}</tr>);
  }

  const yAxis = [<td key={0} />];
  for (let i = 0; i < 20; i++) {
    yAxis.push(
      <td className="w-8 h-8 md:w-12 md:h-12">
        <span className="text-[#037a76] font-bold text-[0.6rem] md:text-base ">
          {i}
        </span>
      </td>
    );
  }
  rows.push(<tr key={20}>{yAxis}</tr>);
  return rows;
};



useEffect(() => {
  if (!path || page >= path.length){
    setRobotState({ x: 1, y: 1, d: Direction.NORTH, s: -1 });
    return;  // Ensure path is defined before accessing its length
  }
    setRobotState(path[page]);
  
}, [page, path]);

// Tab switch handler
const handleTabClick = (tab) => {
  setActiveTab(tab); // Change the active tab
};

const getGridSize = () => {
  // Get the first grid cell element after render
  const firstCell = document.querySelector('td');
  if (firstCell) {
    // Get computed style for the cell's width (which returns value in pixels)
    const computedStyle = window.getComputedStyle(firstCell);
    return parseInt(computedStyle.width, 10);  // Return the width in pixels
  }
  return 32;  // Default to 32px if unable to find the grid cell
};

const getRotationDegrees = (command, isReversing) => {
  let rotationChange = 0;

  // Adjust rotation based on the turn command
  if (command === "BL00" || command === "FR00") {
    rotationChange = 90; // Clockwise turn
  } else if (command === "BR00" || command === "FL00") {
    rotationChange = -90; // Counterclockwise turn
  }
  if (isReversing) {
    rotationChange = -rotationChange;
  }

  // Return the rotation change for this command
  return rotationChange;
};


const getRobotTransform = () => {
  const gridSize = getGridSize();
  const xPos = (robotState.x - 9) * gridSize;
  const yPos = (19 - robotState.y - 1) * gridSize;

  // Use cumulativeRotation instead of recalculating it here
  const transform = `translate(${xPos}px, ${yPos}px) rotate(${cumulativeRotation}deg)`;
  console.log(transform)
  return transform;
};

// This part is the JSX structure of simulator. Render the User interface (UI) pm the screen.
return (
    // Outer container, centered horizontally and vertically
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#ceafb8]">
    
    {/* Team Image Placeholder */}
    <div className="flex flex-col items-center mb-8">
        <img src="/SquidCarLogoWhite.png" alt="Car" className="w-96 h-auto rounded-xl object-contain" />
    </div>

    {/* Header Section with Text for Title/Team */}
    <div className="flex flex-col items-center text-center rounded-xl mb-8 p-0">
        <h1 className="font-bold text-6xl text-black">CZ3004/SC2079: MDP Team 23</h1>
    </div>

    {/* Robot Position and Add Obstacles Menu */}
    <div className="flex flex-col items-center text-center bg-[#f4ebed] rounded-xl shadow-xl p-4 w-5/6">    
        <div className="flex flex-row items-start w-full justify-center">
        {/* Robot Position Section */}
        <div className="form-control flex flex-col items-center bg-[#f44786] rounded-xl shadow-xl p-2 mr-2">
            <h3 className="text-xl font-semibold text-black mb-2">Robot Position</h3>
            <div className="form-control flex flex-col items-center border rounded-lg p-2 bg-[#f4ebed] shadow-inner">
                <label className="input-group input-group-horizontal mb-2">
                <span className="bg-[#037a76] font-semibold rounded p-2 text-lg text-white">X</span>
                <input
                    onChange={onChangeRobotX}
                    type="number"
                    placeholder="1"
                    min="1"
                    max="18"
                    className="input text-center input-bordered text-black w-20 text-lg rounded-lg bg-[#f4ebed]"
                />
                <span className="bg-[#037a76] font-semibold p-2 rounded text-lg text-white">Y</span>
                <input
                    onChange={onChangeRobotY}
                    type="number"
                    placeholder="1"
                    min="1"
                    max="18"
                    className="input text-center input-bordered font-semibold text-black w-20 text-lg bg-[#f4ebed]"
                />
                <span className="bg-[#037a76] font-semibold p-2 rounded text-lg text-white">D</span>
                <select
                    onChange={onRobotDirectionInputChange}
                    value={robotDir}
                    className="select text-center text-black font-semibold py-2 pl-2 pr-6 text-lg bg-[#f4ebed]"
                >
                <option value={ObDirection.NORTH}>Up</option>
                <option value={ObDirection.SOUTH}>Down</option>
                <option value={ObDirection.WEST}>Left</option>
                <option value={ObDirection.EAST}>Right</option>
                </select>
                <button className="btn bg-[#037a76] text-white font-bold btn-success p-2 text-lg ml-2 rounded-lg shadow-md hover:bg-[#037a76]" onClick={onClickRobot}>
                Set
                </button>
                </label>
            </div>
        </div>

        {/* Add Obstacles Section */}
        <div className="form-control flex flex-col items-center bg-[#f44786] rounded-xl shadow-xl p-2 mr-2">
            <h3 className="text-xl font-semibold text-black mb-2">Add Obstacles</h3>
            <div className="form-control flex flex-col items-center border rounded-lg p-2 bg-[#f4ebed] shadow-inner">
                <label className="input-group input-group-horizontal mb-2">
                <span className="bg-[#037a76] font-semibold p-2 rounded text-lg text-white">X</span>
                <input
                    onChange={onChangeX}
                    type="number"
                    placeholder="1"
                    min="0"
                    max="19"
                    className="input text-center input-bordered bg-[#f4ebed] font-semibold text-black w-20 text-lg"
                />
                <span className="bg-[#037a76] font-semibold p-2 rounded text-lg text-white">Y</span>
                <input
                    onChange={onChangeY}
                    type="number"
                    placeholder="1"
                    min="0"
                    max="19"
                    className="input text-center input-bordered bg-[#f4ebed] font-semibold text-black w-20 text-lg"
                />
                <span className="bg-[#037a76] font-semibold p-2 rounded text-lg text-white">D</span>
                <select
                onChange={onDirectionInputChange}
                value={directionInput}
                className="select text-center text-black font-semibold py-2 pl-2 pr-6 text-lg bg-[#f4ebed]"
                >
                <option value={ObDirection.NORTH}>Up</option>
                <option value={ObDirection.SOUTH}>Down</option>
                <option value={ObDirection.WEST}>Left</option>
                <option value={ObDirection.EAST}>Right</option>
                <option value={ObDirection.SKIP}>None</option>
                </select>
                <button className="btn bg-[#037a76] text-white font-bold btn-success p-2 text-lg ml-2 rounded-lg shadow-md hover:bg-[#037a76]" onClick={onClickObstacle}>
                Add
                </button>
                </label>
            </div>
        </div>
    </div>

    {/* Obstacles List */}
    <div className="grid grid-cols-4 gap-x-2 gap-y-4 items-center mt-4">
        {obstacles.map((ob) => {
            return (
            <div
            key={ob}
            className="badge flex flex-row text-black font-semibold bg-[#ceafb8] rounded-xl text-xs md:text-sm h-max border-slate-500 m-1 p-3"
            >
                <div className="flex flex-col">
                <div class="text-lg text-left">X: {ob.x}</div>
                <div class="text-lg text-left">Y: {ob.y}</div>
                <div class="text-lg text-left">D: {DirectionToString[ob.d]}</div>
            </div>
            <div>
                <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="inline-block w-5 h-5 stroke-current "
                onClick={() => onRemoveObstacle(ob)}
                >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                ></path>
                </svg>
            </div>
        </div>
        );
        })}
    </div>
            
    {/* Reset and Submit Buttons */}
    <div className="flex flex-row items-center justify-center mt-4 w-full">
        <button className="btn bg-[#c582b5] text-neutral-900 font-bold p-4 text-xl ml-2 rounded-lg shadow-md hover:bg-[#c582b5] mr-4" onClick={onResetAll}>
            Reset All
        </button>
        <button className="btn bg-[#309eb5] text-neutral-900 font-bold p-4 text-xl ml-2 rounded-lg shadow-md hover:bg-[#309eb5] mr-4" onClick={onReset}>
            Reset Robot
        </button>
        <button className="btn bg-[#b8ddb3] text-neutral-900 font-bold p-4 text-xl ml-2 rounded-lg shadow-md hover:bg-[#b8ddb3]" onClick={compute}>
            Submit
        </button>

    {/* Tab Navigation */}
    <div className="tab">
        <button 
            className="tablinks bg-[#b8ddb3] text-neutral-900 font-bold p-4 text-xl ml-2 rounded-lg shadow-md hover:bg-[#b8ddb3]" 
            onClick={() => {
              if (activeTab === 'State') {
                handleTabClick('Animation');
              } else {
                handleTabClick('State');
              }
            }}
          >
            {activeTab === 'State' ? 'Toggle Robot Movement' : 'Toggle Robot Movement'}
          </button>
        </div>
    </div>

    {/* Navigation Buttons */}
    {path.length > 0 && (
    <div className="flex flex-row items-center text-center font-semibold bg-[#ceafb8] p-4 rounded-xl shadow-xl my-8">
        {/* <button
        className="btn btn-circle pt-2 pl-1"
        disabled={page === 0}
        onClick={() => {
            setPage(page - 1);
        }}
        >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"
            />
        </svg>
        </button> */}

                <span className="mx-5 text-black">
                Step: {page + 1} / {path.length}
                </span>
                <span className="mx-5 text-black">{commands[page]}</span>
                <button
                className="btn btn-circle pt-2 pl-2"
                disabled={page === path.length - 1}
                onClick={() => {
                    setPage(page + 1);
                }}
                >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
                    />
                </svg>
                </button>
            </div>
            )}

            

            {/* Tab Content */}
            <div id="State" className={`tabcontent ${activeTab === 'State' ? 'block' : 'hidden'}`}>
              {/* Display The Grid */}
              <div className="flex justify-center mt-8 p-4">
                <table className="border-collapse">
                  <tbody>{renderGrid()}</tbody>
                </table>

                {/* Animated robot */} 
                <div className="robot" 
                  style={{
                    width: "144px",  // 3x3 grid block (48px * 3)
                    height: "144px",  // 3x3 grid block
                    position: "absolute",
                    transition: "transform 1s ease-in-out",  // Smooth movement and rotation
                    transform: getRobotTransform(),  // Updated to include command-based rotation
                  }}
                >
                  {/* Render the 3x3 grid for the robot */}
                  {[...Array(3)].map((_, row) => (
                    <div 
                      key={row} 
                      className="flex" 
                      style={{ display: "flex", width: "100%", height: "33.33%" }}
                    >
                      {[...Array(3)].map((_, col) => {
                        // Determine if the current cell is the front middle one (based on initially set direction)
                        const isFrontMiddle =
                          (robotDir === Direction.NORTH && row === 0 && col === 1) ||
                          (robotDir === Direction.EAST && row === 1 && col === 2) ||
                          (robotDir === Direction.SOUTH && row === 2 && col === 1) ||
                          (robotDir === Direction.WEST && row === 1 && col === 0);

                        return (
                          <div
                            key={col}
                            style={{
                              width: "33.33%",
                              height: "100%",
                              backgroundColor: isFrontMiddle ? "#037a76" : "#f44786",  // green for front, purple for others
                              border: "1px solid black",  // Optional: border for visual separation
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>

              </div>
            </div>
            
            <div id="Animation" className={`tabcontent ${activeTab === 'Animation' ? 'block' : 'hidden'}`}
            onClick={() => {
              setIsAnimating(!isAnimating);  // Start the animation
            }}
            >
              {/* <h3>Toggle Robot Movement Animation</h3> */}
              <div className="relative flex justify-center mt-8 p-4">
                <table className="border-collapse relative">
                  <tbody>{renderGrid()}</tbody>
                </table>

                {/* Animated robot */} 
                <div className="robot" 
                  style={{
                    width: "144px",  // 3x3 grid block (48px * 3)
                    height: "144px",  // 3x3 grid block
                    position: "absolute",
                    transition: "transform 1s ease-in-out",  // Smooth movement and rotation
                    transform: getRobotTransform(),  // Updated to include command-based rotation
                  }}
                >
                  {/* Render the 3x3 grid for the robot */}
                  {[...Array(3)].map((_, row) => (
                    <div 
                      key={row} 
                      className="flex" 
                      style={{ display: "flex", width: "100%", height: "33.33%" }}
                    >
                      {[...Array(3)].map((_, col) => {
                        // Determine if the current cell is the front middle one (based on initially set direction)
                        const isFrontMiddle =
                          (robotDir === Direction.NORTH && row === 0 && col === 1) ||
                          (robotDir === Direction.EAST && row === 1 && col === 2) ||
                          (robotDir === Direction.SOUTH && row === 2 && col === 1) ||
                          (robotDir === Direction.WEST && row === 1 && col === 0);

                        return (
                          <div
                            key={col}
                            style={{
                              width: "33.33%",
                              height: "100%",
                              backgroundColor: isFrontMiddle ? "#037a76" : "#f44786",  // green for front, purple for others
                              border: "1px solid black",  // Optional: border for visual separation
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
        {/* Logo Section */}
        <div className="flex justify-center mt-8 space-x-4"> {/* Add spacing between images */}
          <img src="/SquidCarLeft.png" alt="Left Car" className="w-48 h-auto rounded-xl object-contain" />
          <img src="/SquidCarLogo.png" alt="Logo" className="w-96 h-auto rounded-xl object-contain" />
          <img src="/SquidCarRight.png" alt="Right Car" className="w-48 h-auto rounded-xl object-contain" />
        </div>
        </div>
    </div>
);
}