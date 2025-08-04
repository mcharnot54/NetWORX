import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not configured, returning empty projects array');
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    const projects = await ProjectService.getProjects();

    return NextResponse.json({
      success: true,
      data: projects || []
    });
  } catch (error) {
    console.error('Error fetching projects:', error);

    // Return empty array instead of error to prevent UI crashes
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'Database connection failed, returning empty data'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      owner_id,
      project_duration_years,
      base_year,
      status 
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const newProject = await ProjectService.createProject({
      name,
      description,
      owner_id: owner_id || "current_user",
      project_duration_years: project_duration_years || 5,
      base_year: base_year || new Date().getFullYear(),
      status: status || 'active'
    });

    return NextResponse.json({
      success: true,
      data: newProject
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
