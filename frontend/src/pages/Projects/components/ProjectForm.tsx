import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../components/ui/checkbox";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
} from "../../../types/project";

interface ProjectFormProps {
  project?: Project | null;
  onSubmit: (data: ProjectCreate | ProjectUpdate) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    auto_sync_files: true,
    auto_setup_vm: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with project data if editing
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || "",
        auto_sync_files: project.auto_sync_files,
        auto_setup_vm: false, // Don't auto-setup VM when editing
      });
    }
  }, [project]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Project name is required";
    } else if (formData.name.length < 3) {
      newErrors.name = "Project name must be at least 3 characters";
    } else if (formData.name.length > 100) {
      newErrors.name = "Project name must be less than 100 characters";
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      auto_sync_files: formData.auto_sync_files,
      ...(project ? {} : { auto_setup_vm: formData.auto_setup_vm }),
    };

    onSubmit(submitData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Name */}
      <div className="space-y-2">
        <Label
          htmlFor="name"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Project Name *
        </Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          placeholder="Enter project name..."
          className={`${
            errors.name ? "border-red-500 focus:border-red-500" : ""
          }`}
          disabled={loading}
        />
        {errors.name && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.name}
          </p>
        )}
      </div>

      {/* Project Description */}
      <div className="space-y-2">
        <Label
          htmlFor="description"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Description
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          placeholder="Enter project description (optional)..."
          rows={3}
          className={`${
            errors.description ? "border-red-500 focus:border-red-500" : ""
          }`}
          disabled={loading}
        />
        {errors.description && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.description}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formData.description.length}/500 characters
        </p>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Project Settings
        </Label>

        <div className="space-y-3">
          {/* Auto Sync Files */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="auto_sync_files"
              checked={formData.auto_sync_files}
              onCheckedChange={(checked) =>
                handleInputChange("auto_sync_files", checked === true)
              }
              disabled={loading}
            />
            <div className="space-y-1">
              <Label
                htmlFor="auto_sync_files"
                className="text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Auto-sync files to VM workspace
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Automatically sync uploaded files to the VM workspace when
                changes are made
              </p>
            </div>
          </div>

          {/* Auto Setup VM (only for new projects) */}
          {!project && (
            <div className="flex items-center space-x-3">
              <Checkbox
                id="auto_setup_vm"
                checked={formData.auto_setup_vm}
                onCheckedChange={(checked) =>
                  handleInputChange("auto_setup_vm", checked === true)
                }
                disabled={loading}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="auto_setup_vm"
                  className="text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Set up VM workspace immediately
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Create and configure the VM workspace when the project is
                  created
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={loading}
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {project ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </form>
  );
};
