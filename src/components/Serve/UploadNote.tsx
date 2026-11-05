// src/components/UploadNote.js
import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
export default function UploadNote() {
  const [courses, setCourses] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");

  // Fetch all courses
  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase.from("courses").select("*");
      if (!error) setCourses(data || []);
      else console.error("Error fetching courses:", error);
    };
    fetchCourses();
  }, []);

  // Fetch topics for selected course
  useEffect(() => {
    if (!selectedCourse) {
      setTopics([]);
      setSelectedTopic("");
      return;
    }

    const fetchTopics = async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("course_id", selectedCourse);
      if (!error) setTopics(data || []);
      else console.error("Error fetching topics:", error);
    };
    fetchTopics();
  }, [selectedCourse]);

  // Upload note
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedCourse || !selectedTopic || !noteTitle || !content) {
      setStatus("⚠️ Fill all fields.");
      return;
    }

    const noteId = noteTitle.toLowerCase().replace(/\s+/g, "_");

    const { error } = await supabase.from("notes").insert([
      {
        id: noteId,
        course_id: selectedCourse,
        topic_id: selectedTopic,
        title: noteTitle,
        content,
        created_at: new Date().toISOString(),
      },
    ]);

    if (!error) {
      setStatus("✅ Note uploaded successfully!");
      setNoteTitle("");
      setContent("");
    } else {
      console.error("Error uploading note:", error);
      setStatus("❌ Failed to upload note.");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-background dark:bg-gray-900 rounded-lg shadow-card transition-colors">
      <h2 className="text-xl font-bold mb-4 text-text dark:text-gray-100">
        Upload a New Note
      </h2>
      <form onSubmit={handleUpload} className="flex flex-col gap-3">
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="p-2 border rounded dark:bg-gray-800 dark:text-white"
        >
          <option value="">Select Course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="p-2 border rounded dark:bg-gray-800 dark:text-white"
          disabled={!selectedCourse}
        >
          <option value="">Select Topic</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Note Title"
          value={noteTitle}
          onChange={(e) => setNoteTitle(e.target.value)}
          className="p-2 border rounded dark:bg-gray-800 dark:text-white"
        />

        <textarea
          placeholder="Content"
          rows="6"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="p-2 border rounded dark:bg-gray-800 dark:text-white"
        />

        <button type="submit" className="bg-primary text-white py-2 rounded">
          Upload Note
        </button>
      </form>

      {status && <p className="mt-3 text-sm dark:text-gray-300">{status}</p>}
    </div>
  );
}
