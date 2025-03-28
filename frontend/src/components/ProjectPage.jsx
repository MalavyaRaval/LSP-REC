import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "./Nav/Navbar";
import Footer from "./Footer";
import ProjectTree from "./ProjectTree";
import DemaChat from "./DemaChat.jsx";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import axios from "axios";
import { Resizable } from "re-resizable";

const ProjectPage = () => {
  const { username, projectname } = useParams();
  const navigate = useNavigate();

  // Convert projectname to a slug for use as projectId.
  const projectSlug = projectname;
  const storedFullName = localStorage.getItem("fullName")?.trim();
  const evaluatorName = storedFullName || username || "defaultUser";

  // State for project display name (from the project tree root's "name")
  const [projectDisplayName, setProjectDisplayName] = useState("");
  // State for scale (for zoom/drag features)
  const [scale, setScale] = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (projectSlug) {
      axios
        .get(`http://localhost:8000/api/projects/${projectSlug}`)
        .then((res) => {
          if (res.data && res.data.name) {
            setProjectDisplayName(res.data.name);
          } else {
            setProjectDisplayName(projectname);
          }
        })
        .catch((err) => {
          console.error("Error loading project name:", err);
          setProjectDisplayName(projectname);
        });
    }
  }, [projectSlug, projectname]);

  const handleNav = (action) => {
    if (action === "projects") {
      navigate("/home");
    } else if (action === "validation") {
      navigate(`/user/${evaluatorName}/project/${projectSlug}/validation`);
    } else if (action === "queryResults") {
      navigate(`/user/${evaluatorName}/project/${projectSlug}/Queryresults`);
    } else if (action === "evaluate") {
      navigate(`/user/${evaluatorName}/project/${projectSlug}/evaluate`);
    } else if (action === "exit") {
      navigate("/");
    } else {
      console.log(`Navigate to ${action}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />

      {/* Main Content Wrapper */}
      <div className="flex-grow p-4">
        {/* Top Navigation Section */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 shadow-md p-3 rounded mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-900">
              LSP Rec Project
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="px-4 py-2 bg-blue-500 text-black rounded hover:bg-blue-600"
              onClick={() => handleNav("projects")}
            >
              All Projects
            </button>
            <button
              className="px-4 py-2 bg-green-500 text-black rounded hover:bg-green-600"
              onClick={() => handleNav("validation")}
            >
              Validation
            </button>
            <button
              className="px-4 py-2 bg-teal-500 text-black rounded hover:bg-teal-600"
              onClick={() => handleNav("evaluate")}
            >
              Evaluate
            </button>
            <button
              className="px-4 py-2 bg-purple-500 text-black rounded hover:bg-purple-600"
              onClick={() => handleNav("queryResults")}
            >
              Query Results
            </button>
            <button
              className="px-4 py-2 bg-red-500 text-black rounded hover:bg-red-600"
              onClick={() => handleNav("exit")}
            >
              Exit
            </button>
          </div>
        </div>

        {/* Project and Evaluator Information */}
        <div className="mb-4">
          <p className="text-lg text-gray-700 dark:text-gray-900">
            <strong>User:</strong> {evaluatorName}
          </p>
          <p className="text-lg text-gray-700 dark:text-gray-900">
            <strong>Project:</strong>{" "}
            {projectDisplayName ||
              (projectname ? projectname.toUpperCase() : "N/A")}
          </p>
        </div>

        {/* Main Content Area (Vertical Stack) */}
        <div className="flex flex-col gap-6 items-center">
          {" "}
          <div
            style={{
              width: "1200px",
              minHeight: "700px", // Set a minimum height to ensure it doesn't shrink too small
              height: "auto", // Allow the height to auto-adjust based on content
            }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mx-auto"
          >
            <DemaChat />
          </div>
          {/* Project Tree Container */}
          <Resizable
            defaultSize={{
              width: 1200,
              height: 800,
            }}
            minWidth={300}
            minHeight={200}
            enable={{
              top: false,
              right: true,
              bottom: true,
              left: false,
              topRight: true,
              bottomRight: true,
              bottomLeft: true,
              topLeft: true,
            }}
          >
            <div
              className="relative bg-white rounded-lg shadow-lg overflow-hidden p-4"
              style={{
                width: "100%",
                height: "100%",
                backgroundImage:
                  "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            >
              <TransformWrapper
                initialScale={scale}
                centerOnInit={true}
                wheel={{ step: 0.2 }}
                doubleClick={{ disabled: true }}
                limitToBounds={false}
                preservePosition={true}
                minScale={0.25}
                maxScale={1}
                onScaleChange={({ scale }) => setScale(scale)}
              >
                {({ resetTransform }) => (
                  <>
                    <TransformComponent
                      wrapperStyle={{ width: "100%", height: "100%" }}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <ProjectTree
                          projectId={projectSlug}
                          username={evaluatorName}
                          projectname={projectname}
                        />
                      </div>
                    </TransformComponent>
                    <button
                      className="absolute bottom-4 right-4 px-3 py-2 bg-blue-500 text-black rounded-lg shadow-md hover:bg-blue-600 z-50"
                      onClick={() => resetTransform()}
                    >
                      Reset View
                    </button>
                  </>
                )}
              </TransformWrapper>
            </div>
          </Resizable>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default ProjectPage;
