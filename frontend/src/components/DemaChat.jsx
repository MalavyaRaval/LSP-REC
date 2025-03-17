import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import LeafProcessing from "./LeafProcessing.jsx";
import ParentProcessing from "./ParentProcessing.jsx";
import ProjectEvaluation from "./ProjectEvaluation.jsx";

// Helper: recursively extract leaf nodes (nodes with no children)
const getLeafNodes = (node) => {
  if (!node.children || node.children.length === 0) return [node];
  let leaves = [];
  node.children.forEach((child) => {
    leaves = leaves.concat(getLeafNodes(child));
  });
  return leaves;
};

const DemaChat = () => {
  const { username, projectname } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const parentIdQuery = query.get("parentId");

  const projectId = projectname;
  const [parentId, setParentId] = useState(parentIdQuery || null);
  const [parentName, setParentName] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [childrenCount, setChildrenCount] = useState("");
  const [childrenDetails, setChildrenDetails] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [bfsQueue, setBfsQueue] = useState([]);
  // States for leaf processing.
  const [processingLeaves, setProcessingLeaves] = useState(false);
  const [leafNodes, setLeafNodes] = useState([]);
  const [currentLeafIndex, setCurrentLeafIndex] = useState(0);
  const [leafValues, setLeafValues] = useState({});
  const [error, setError] = useState("");
  // States for parent processing.
  const [processingParents, setProcessingParents] = useState(false);
  const [parentNodes, setParentNodes] = useState([]);
  const [currentParentIndex, setCurrentParentIndex] = useState(0);
  // New state to track processed parent IDs.
  const [processedParentIds, setProcessedParentIds] = useState(new Set());
  const [evaluationStarted, setEvaluationStarted] = useState(false);

  const messagesEndRef = useRef(null);

  const steps = [
    { id: "childrenCount", question: "Enter the number of Components" },
    { id: "childrenDetails", question: "Enter details for each Component" },
  ];

  // Helper: Recursively find a node by id.
  const findNodeById = (node, id) => {
    if (node.id?.toString() === id.toString()) return node;
    if (!node.children || node.children.length === 0) return null;
    for (let child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  };

  useEffect(() => {
    const storedQueue = JSON.parse(sessionStorage.getItem("bfsQueue") || "[]");
    setBfsQueue(storedQueue);
  }, []);

  useEffect(() => {
    const fetchRoot = async () => {
      try {
        if (!parentId) {
          const res = await axios.get(
            `http://localhost:8000/api/projects/${projectId}`
          );
          if (res.data && res.data.id) {
            setParentId(res.data.id.toString());
          } else {
            console.warn("No root node found; check backend logic.");
          }
        }
      } catch (err) {
        console.error("Failed to fetch project root:", err);
      }
    };
    if (projectId && !parentId) {
      fetchRoot();
    }
  }, [projectId, parentId]);

  useEffect(() => {
    const fetchParentName = async () => {
      if (parentId) {
        try {
          const res = await axios.get(
            `http://localhost:8000/api/projects/${projectId}`
          );
          if (res.data) {
            const treeData = res.data;
            const node = findNodeById(treeData, parentId);
            setParentName((node && node.name) || "Unknown");
          }
        } catch (err) {
          console.error("Error fetching parent details:", err);
          setParentName("Unknown");
        }
      }
    };
    fetchParentName();
  }, [parentId, projectId]);

  useEffect(() => {
    const pid = new URLSearchParams(location.search).get("parentId");
    if (pid) setParentId(pid);
  }, [location.search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [
    currentStep,
    processingLeaves,
    currentLeafIndex,
    processingParents,
    currentParentIndex,
  ]);

  const handleCountSubmit = () => {
    const count = parseInt(childrenCount);
    if (isNaN(count) || count < 2 || count > 5) {
      alert("Please enter a number between 2 and 5.");
      return;
    }
    const details = Array.from({ length: count }, (_, i) => ({
      id: i,
      name: "",
      decompose: false,
    }));
    setChildrenDetails(details);
    setCurrentStep(1);
  };

  const handleDetailChange = (index, field, value) => {
    const newDetails = [...childrenDetails];
    newDetails[index][field] = field === "decompose" ? value === "true" : value;
    setChildrenDetails(newDetails);
  };

  const saveChildren = async () => {
    const effectiveParentId = parentId;
    if (!effectiveParentId) {
      alert("Parent node is not set. Please try again.");
      return [];
    }

    const childrenNodes = childrenDetails.map((child, index) => ({
      id: `${effectiveParentId}-${Date.now()}-${index}`, // generated id
      // Use the user-provided name trimmed; if empty, assign a default name
      name: child.name.trim() || `Child ${index + 1}`,
      decompose: child.decompose,
      attributes: { created: Date.now() },
      children: [],
      parent: effectiveParentId,
    }));

    try {
      const res = await axios.post(
        `http://localhost:8000/api/projects/${projectId}/nodes`,
        {
          parentId: effectiveParentId,
          children: childrenNodes,
          metadata: {
            decisionProcess: "DEMA",
            objectName: "My Object",
          },
        }
      );
      const treeData = res.data;
      const parentNode = findNodeById(treeData, effectiveParentId);
      if (
        !parentNode ||
        !parentNode.children ||
        parentNode.children.length === 0
      ) {
        console.warn("No children were created for the current parent.");
        finalizeNode();
        return [];
      }
      const createdChildren = parentNode.children;

      const nodesToDecompose = createdChildren.filter(
        (child) =>
          child.decompose === true ||
          (child.attributes && child.attributes.decompose === true)
      );

      const storedQueue = JSON.parse(
        sessionStorage.getItem("bfsQueue") || "[]"
      );
      const updatedQueue = [...storedQueue, ...nodesToDecompose];
      sessionStorage.setItem("bfsQueue", JSON.stringify(updatedQueue));
      setBfsQueue(updatedQueue);
      return updatedQueue;
    } catch (error) {
      console.error("Error saving children:", error);
      throw error;
    }
  };

  const handleProcessChildren = async () => {
    try {
      setProcessing(true);
      const updatedQueue = await saveChildren();
      if (updatedQueue && updatedQueue.length > 0) {
        const [nextNode, ...remaining] = updatedQueue;
        sessionStorage.setItem("bfsQueue", JSON.stringify(remaining));
        setBfsQueue(remaining);
        setParentId(nextNode.id);
        setChildrenCount("");
        setChildrenDetails([]);
        setCurrentStep(0);
      } else {
        finalizeNode();
      }
    } catch (error) {
      console.error("Error processing Components:", error);
      alert("Failed to process Components nodes.");
    } finally {
      setProcessing(false);
    }
  };

  // Inside DemaChat.jsx, modify finalizeNode:
  const finalizeNode = async () => {
    alert("All decompositions complete for this node! Finalizing tree.");
    window.dispatchEvent(new Event("refreshProjectTree"));
    setParentId(null);
    setChildrenCount("");
    setChildrenDetails([]);
    setCurrentStep(0);
    try {
      const res = await axios.get(
        `http://localhost:8000/api/projects/${projectId}`
      );
      const treeData = res.data;
      const leaves = getLeafNodes(treeData);
      console.log("Leaf nodes found:", leaves);
      setLeafNodes(leaves);
      setProcessingLeaves(true);
      setCurrentLeafIndex(0);
      // Reset processed parents since we are starting a new parent processing phase.
      setProcessedParentIds(new Set());
      // --- New check for parent nodes ---
      // If none of the leaves have a parent different from the root, then finalization is complete.
      // New check for parent nodes:
      const hasParentNodes = treeData.children && treeData.children.length > 0;
      if (!hasParentNodes) {
        alert("No parent nodes to process. Tree finalization complete.");
        setEvaluationStarted(true);
      }
    } catch (error) {
      console.error("Error fetching tree after finalizing:", error);
    }
  };

  // ----- Start Processing Parents after Leaves -----
  const startParentProcessing = async () => {
    try {
      const res = await axios.get(
        `http://localhost:8000/api/projects/${projectId}`
      );
      const treeData = res.data;
      let initialParentIds = new Set();
      leafNodes.forEach((leaf) => {
        if (leaf.parent && leaf.parent.toString() !== treeData.id.toString()) {
          initialParentIds.add(leaf.parent.toString());
        }
      });
      // Filter out already processed parent IDs (should be empty on first call)
      const filteredParentIds = Array.from(initialParentIds).filter(
        (pid) => !processedParentIds.has(pid)
      );
      // Mark these as processed
      const newProcessed = new Set(processedParentIds);
      filteredParentIds.forEach((pid) => newProcessed.add(pid));
      setProcessedParentIds(newProcessed);
      const parentNodesArr = filteredParentIds
        .map((pid) => findNodeById(treeData, pid))
        .filter(Boolean);
      if (parentNodesArr.length > 0) {
        setParentNodes(parentNodesArr);
        setCurrentParentIndex(0);
        setProcessingParents(true);
      } else {
        alert("No parent nodes to process. Tree finalization complete.");
        setEvaluationStarted(true);
      }
    } catch (err) {
      console.error("Error starting parent processing:", err);
    }
  };

  const processNextParentLevel = async () => {
    try {
      const res = await axios.get(
        `http://localhost:8000/api/projects/${projectId}`
      );
      const treeData = res.data;
      let nextLevelParentIds = new Set();
      parentNodes.forEach((node) => {
        if (node.parent && node.parent.toString() !== treeData.id.toString()) {
          nextLevelParentIds.add(node.parent.toString());
        }
      });
      // Filter out IDs that have already been processed.
      const filteredNextIds = Array.from(nextLevelParentIds).filter(
        (pid) => !processedParentIds.has(pid)
      );
      // Update the processed parent set.
      const newProcessed = new Set(processedParentIds);
      filteredNextIds.forEach((pid) => newProcessed.add(pid));
      setProcessedParentIds(newProcessed);
      const nextParentsArr = filteredNextIds
        .map((pid) => findNodeById(treeData, pid))
        .filter(Boolean);
      if (nextParentsArr.length > 0) {
        setParentNodes(nextParentsArr);
        setCurrentParentIndex(0);
      } else {
        setProcessingParents(false);
        // Start evaluation phase instead of alert:
        setEvaluationStarted(true);
      }
    } catch (err) {
      console.error("Error processing next parent level:", err);
    }
  };

  const renderStep = () => {
    if (evaluationStarted) {
      return <ProjectEvaluation />;
    }
    if (processingLeaves) {
      return (
        <LeafProcessing
          leafNodes={leafNodes}
          currentLeafIndex={currentLeafIndex}
          leafValues={leafValues}
          setLeafValues={setLeafValues}
          error={error}
          setError={setError}
          onNextLeaf={() => {
            if (currentLeafIndex < leafNodes.length - 1) {
              setCurrentLeafIndex(currentLeafIndex + 1);
            } else {
              setProcessingLeaves(false);
              startParentProcessing();
            }
          }}
          onPrevLeaf={() => {
            if (currentLeafIndex > 0) {
              setCurrentLeafIndex(currentLeafIndex - 1);
            }
          }}
        />
      );
    }
    if (processingParents) {
      return (
        <ParentProcessing
          parentNodes={parentNodes}
          currentParentIndex={currentParentIndex}
          onNextParent={() => {
            if (currentParentIndex < parentNodes.length - 1) {
              setCurrentParentIndex(currentParentIndex + 1);
            } else {
              processNextParentLevel();
            }
          }}
          onPrevParent={() => {
            if (currentParentIndex > 0) {
              setCurrentParentIndex(currentParentIndex - 1);
            }
          }}
          projectId={projectId}
        />
      );
    }
    if (currentStep === 0) {
      return (
        <div className="p-6 bg-white rounded-lg shadow-md mx-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {steps[0].question} for{" "}
            <span className="text-indigo-600">{parentName}</span>
          </h2>
          <div className="flex items-center">
            <input
              type="number"
              value={childrenCount}
              onChange={(e) => setChildrenCount(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 w-1/4"
              min="2"
              max="5"
              placeholder="2 - 5"
            />
            <button
              className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              onClick={handleNextStep}
            >
              Continue
            </button>
          </div>
        </div>
      );
    } else if (currentStep === 1) {
      return (
        <div className="p-6 bg-white rounded-lg shadow-md mx-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {steps[1].question} for{" "}
            <span className="text-indigo-600">{parentName}</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Component Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Decompose?
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {childrenDetails.map((child, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        placeholder={`Child ${index + 1} name`}
                        value={child.name}
                        onChange={(e) =>
                          handleDetailChange(index, "name", e.target.value)
                        }
                        className="border border-gray-300 rounded-lg p-2 w-full"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex rounded-md shadow-sm">
                        <button
                          onClick={() =>
                            handleDetailChange(index, "decompose", "true")
                          }
                          className={`px-4 py-2 border border-gray-300 text-sm font-medium ${
                            child.decompose
                              ? "bg-green-500 text-white"
                              : "bg-white text-gray-700 hover:bg-green-100"
                          } rounded-l-md`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() =>
                            handleDetailChange(index, "decompose", "false")
                          }
                          className={`px-4 py-2 border border-gray-300 text-sm font-medium ${
                            !child.decompose
                              ? "bg-red-500 text-white"
                              : "bg-white text-gray-700 hover:bg-red-100"
                          } rounded-r-md`}
                        >
                          No
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between mt-6">
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              onClick={handleBackStep}
            >
              Back
            </button>
            <button
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              onClick={handleNextStep}
              disabled={processing}
            >
              {processing ? "Processing..." : "Process Components"}
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleNextStep = () => {
    if (currentStep === 0) {
      handleCountSubmit();
    } else if (currentStep === 1) {
      if (childrenDetails.some((child) => !child.name.trim())) {
        alert("Please fill in all Component names.");
        return;
      }
      handleProcessChildren();
    }
  };

  const handleBackStep = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  return (
    <div className="w-full h-full p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:bg-gray-800 rounded-lg shadow-xl flex flex-col">
      <header className="flex items-center justify-between p-4 border-b bg-gray-200 rounded-t-lg">
        <h1 className="text-xl font-bold text-gray-800">
          DeMA Decision Assistant
        </h1>
      </header>
      <main className="flex-1 p-4 overflow-y-auto">{renderStep()}</main>
      <div ref={messagesEndRef} />
    </div>
  );
};

export default DemaChat;
