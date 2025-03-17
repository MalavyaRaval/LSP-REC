import React, { useState } from "react";
import axios from "axios";

const Query6 = ({ onSave, nodeId, projectId, nodeName }) => {
  // Added nodeName here
  const [values, setValues] = useState({ lower: "", middle: "", upper: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const lower = parseFloat(values.lower);
    const middle = parseFloat(values.middle);
    const upper = parseFloat(values.upper);
    if (isNaN(lower) || isNaN(middle) || isNaN(upper)) {
      setError("Please enter valid numbers in all fields.");
      return false;
    }
    if (!(lower < middle && middle < upper)) {
      setError("Ensure that lower < middle < upper.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSaveQuery = async () => {
    if (validate()) {
      try {
        await axios.post("http://localhost:8000/api/query-results", {
          nodeId,
          nodeName, // Pass nodeName in payload
          queryType: "q6",
          values,
          projectId,
        });
        onSave();
      } catch (err) {
        setError("Failed to save query result.");
        console.error(err);
      }
    }
  };

  return (
    <div className="p-4 border rounded">
      {/* Existing UI for Query6 */}
      <table className="min-w-full border-collapse border border-gray-400 mb-4">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-400 p-2">Description</th>
            <th className="border border-gray-400 p-2">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr className="hover:bg-gray-100">
            <td className="border border-gray-400 p-2">
              It is unacceptable if the value is less than
            </td>
            <td className="border border-gray-400 p-2">
              <input
                type="number"
                name="lower"
                value={values.lower}
                onChange={handleChange}
                onBlur={validate}
                className="w-full border rounded px-2 py-1"
              />
            </td>
          </tr>
          <tr className="hover:bg-gray-100">
            <td className="border border-gray-400 p-2">
              I am fully satisfied if the offered value is between the following
              two values
            </td>
            <td className="border border-gray-400 p-2">
              <input
                type="number"
                name="middle"
                value={values.middle}
                onChange={handleChange}
                onBlur={validate}
                className="w-full border rounded px-2 py-1"
              />
            </td>
          </tr>
          <tr className="hover:bg-gray-100">
            <td className="border border-gray-400 p-2">
              It is unacceptable if the value is greater than
            </td>
            <td className="border border-gray-400 p-2">
              <input
                type="number"
                name="upper"
                value={values.upper}
                onChange={handleChange}
                onBlur={validate}
                className="w-full border rounded px-2 py-1"
              />
            </td>
          </tr>
        </tbody>
      </table>
      {error && <p className="text-red-500">{error}</p>}
      <button
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        onClick={handleSaveQuery}
      >
        Save and Next
      </button>
    </div>
  );
};

export default Query6;
