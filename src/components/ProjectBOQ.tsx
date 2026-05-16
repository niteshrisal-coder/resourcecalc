import React from 'react';
import ProjectBOQComponent from './ProjectBOQ/ProjectBOQ';
import { Project } from '../types/boq';
import { Norm } from '../types';

interface ProjectBOQProps {
  project: Project;
  norms: Norm[];
  onBack: () => void;
}

export default function ProjectBOQ(props: ProjectBOQProps) {
  return <ProjectBOQComponent {...props} />;
}