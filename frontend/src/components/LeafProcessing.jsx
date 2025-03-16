import React, { useState } from "react";
import { useParams } from "react-router-dom";
import Query4 from "./Query4.jsx";
import Query5 from "./Query5.jsx";
import Query6 from "./Query6.jsx";
import Query7 from "./Query7.jsx";

const LeafProcessing = ({
  leafNodes,
  currentLeafIndex,
  onNextLeaf,
  onPrevLeaf,
}) => {
  const { username, projectname } = useParams();
  const [composition, setComposition] = useState(""); // holds the selected query e.g. "q4"

  if (!leafNodes || leafNodes.length === 0) return null;
  const currentLeaf = leafNodes[currentLeafIndex];

  // When the user selects a composition, switch into query mode.
  const handleSelectComposition = (comp) => {
    setComposition(comp);
  };

  // Called when the query component signals that saving is complete.
  const handleSaveAndNext = () => {
    // (Optional) Save the query results via an API call here.
    setComposition("");
    onNextLeaf();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md mx-4">
      <h2 className="text-xl font-semibold mb-4">
        For leaf: <span className="text-indigo-600">{currentLeaf.name}</span>
      </h2>
      {!composition ? (
        <>
          <p className="mb-4">
            Which composition do you want to perform for this leaf?
          </p>
          <div className="flex flex-col gap-3">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => handleSelectComposition("q4")}
            >
              Q4: I prefer high values
            </button>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              onClick={() => handleSelectComposition("q5")}
            >
              Q5: I prefer low values
            </button>
            <button
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
              onClick={() => handleSelectComposition("q6")}
            >
              Q6: I prefer a specific range
            </button>
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={() => handleSelectComposition("q7")}
            >
              Q7: I will specify a table of requirements
            </button>
          </div>
        </>
      ) : (
        <>
          {composition === "q4" && <Query4 onSave={handleSaveAndNext} />}
          {composition === "q5" && <Query5 onSave={handleSaveAndNext} />}
          {composition === "q6" && <Query6 onSave={handleSaveAndNext} />}
          {composition === "q7" && <Query7 onSave={handleSaveAndNext} />}
        </>
      )}
      <div className="flex justify-between mt-6">
        <button
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          onClick={onPrevLeaf}
        >
          Back
        </button>
        {!composition && (
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={onNextLeaf}
          >
            Next Leaf
          </button>
        )}
      </div>
    </div>
  );
};

export default LeafProcessing;
