export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string | null
          actor_id: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          event: string
          id: string
          module: string | null
          status: string
        }
        Insert: {
          action?: string | null
          actor_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event: string
          id?: string
          module?: string | null
          status?: string
        }
        Update: {
          action?: string | null
          actor_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event?: string
          id?: string
          module?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_acknowledgements: {
        Row: {
          acknowledged_at: string
          alert_id: string
          id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          alert_id: string
          id?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          alert_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_acknowledgements_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_acknowledgements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string
          created_by: string | null
          disaster_id: string | null
          expires_at: string | null
          id: string
          location: string
          message: string
          recipients: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          target_teams: string[]
          title: string
          training_id: string | null
        }
        Insert: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          created_by?: string | null
          disaster_id?: string | null
          expires_at?: string | null
          id?: string
          location?: string
          message: string
          recipients?: string
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          target_teams?: string[]
          title: string
          training_id?: string | null
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          created_by?: string | null
          disaster_id?: string | null
          expires_at?: string | null
          id?: string
          location?: string
          message?: string
          recipients?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          target_teams?: string[]
          title?: string
          training_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_disaster_id_fkey"
            columns: ["disaster_id"]
            isOneToOne: false
            referencedRelation: "disasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      allocations: {
        Row: {
          allocated_by: string
          created_at: string
          disaster_id: string | null
          id: string
          quantity: number
          resource_id: string
          status: Database["public"]["Enums"]["allocation_status"]
          training_id: string
          volunteer_id: string | null
        }
        Insert: {
          allocated_by: string
          created_at?: string
          disaster_id?: string | null
          id?: string
          quantity: number
          resource_id: string
          status?: Database["public"]["Enums"]["allocation_status"]
          training_id: string
          volunteer_id?: string | null
        }
        Update: {
          allocated_by?: string
          created_at?: string
          disaster_id?: string | null
          id?: string
          quantity?: number
          resource_id?: string
          status?: Database["public"]["Enums"]["allocation_status"]
          training_id?: string
          volunteer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_disaster_id_fkey"
            columns: ["disaster_id"]
            isOneToOne: false
            referencedRelation: "disasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_date: string
          created_at: string
          id: string
          participant_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          training_id: string
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          created_at?: string
          id?: string
          participant_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          training_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          id?: string
          participant_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          training_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "training_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      disasters: {
        Row: {
          address: string
          area: string
          city: string
          created_at: string
          deaths: number
          description: string
          disaster_code: string
          disaster_type: Database["public"]["Enums"]["disaster_type"]
          district: string
          estimated_damage: number
          evacuated: number
          id: string
          injured: number
          latitude: number
          longitude: number
          missing: number
          occurred_at: string
          people_affected: number
          reported_by: string | null
          response_status: string
          severity: Database["public"]["Enums"]["disaster_severity"]
          state: string
          status: Database["public"]["Enums"]["disaster_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address?: string
          area?: string
          city: string
          created_at?: string
          deaths?: number
          description?: string
          disaster_code?: string
          disaster_type: Database["public"]["Enums"]["disaster_type"]
          district: string
          estimated_damage?: number
          evacuated?: number
          id?: string
          injured?: number
          latitude: number
          longitude: number
          missing?: number
          occurred_at: string
          people_affected?: number
          reported_by?: string | null
          response_status?: string
          severity: Database["public"]["Enums"]["disaster_severity"]
          state: string
          status?: Database["public"]["Enums"]["disaster_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string
          area?: string
          city?: string
          created_at?: string
          deaths?: number
          description?: string
          disaster_code?: string
          disaster_type?: Database["public"]["Enums"]["disaster_type"]
          district?: string
          estimated_damage?: number
          evacuated?: number
          id?: string
          injured?: number
          latitude?: number
          longitude?: number
          missing?: number
          occurred_at?: string
          people_affected?: number
          reported_by?: string | null
          response_status?: string
          severity?: Database["public"]["Enums"]["disaster_severity"]
          state?: string
          status?: Database["public"]["Enums"]["disaster_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disasters_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          availability: string
          contact_number: string
          created_at: string
          description: string
          id: string
          location: string
          organization: string
          service: string
          updated_at: string
        }
        Insert: {
          availability?: string
          contact_number: string
          created_at?: string
          description?: string
          id?: string
          location: string
          organization: string
          service: string
          updated_at?: string
        }
        Update: {
          availability?: string
          contact_number?: string
          created_at?: string
          description?: string
          id?: string
          location?: string
          organization?: string
          service?: string
          updated_at?: string
        }
        Relationships: []
      }
      evacuations: {
        Row: {
          created_at: string
          destination_shelter_id: string | null
          disaster_id: string
          end_time: string | null
          evacuation_code: string
          evacuation_zone: string
          id: string
          people_evacuated: number
          people_to_evacuate: number
          remaining: number | null
          responsible_team_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["evacuation_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_shelter_id?: string | null
          disaster_id: string
          end_time?: string | null
          evacuation_code?: string
          evacuation_zone: string
          id?: string
          people_evacuated?: number
          people_to_evacuate: number
          remaining?: number | null
          responsible_team_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["evacuation_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_shelter_id?: string | null
          disaster_id?: string
          end_time?: string | null
          evacuation_code?: string
          evacuation_zone?: string
          id?: string
          people_evacuated?: number
          people_to_evacuate?: number
          remaining?: number | null
          responsible_team_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["evacuation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evacuations_destination_shelter_id_fkey"
            columns: ["destination_shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evacuations_disaster_id_fkey"
            columns: ["disaster_id"]
            isOneToOne: false
            referencedRelation: "disasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evacuations_responsible_team_id_fkey"
            columns: ["responsible_team_id"]
            isOneToOne: false
            referencedRelation: "response_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comments: string
          created_at: string
          id: string
          rating: number
          training_id: string
          user_id: string
        }
        Insert: {
          comments: string
          created_at?: string
          id?: string
          rating: number
          training_id: string
          user_id: string
        }
        Update: {
          comments?: string
          created_at?: string
          id?: string
          rating?: number
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_disaster_responses: {
        Row: {
          created_at: string
          disaster_id: string
          hospital_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          disaster_id: string
          hospital_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          disaster_id?: string
          hospital_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_disaster_responses_disaster_id_fkey"
            columns: ["disaster_id"]
            isOneToOne: false
            referencedRelation: "disasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_disaster_responses_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "medical_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_facilities: {
        Row: {
          address: string
          ambulance_count: number
          available_beds: number
          available_icu_beds: number
          contact: string
          created_at: string
          emergency_capacity: number
          hospital_code: string
          hospital_name: string
          icu_beds: number
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          status: string
          total_beds: number
          updated_at: string
        }
        Insert: {
          address: string
          ambulance_count?: number
          available_beds?: number
          available_icu_beds?: number
          contact: string
          created_at?: string
          emergency_capacity?: number
          hospital_code?: string
          hospital_name: string
          icu_beds?: number
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          status?: string
          total_beds?: number
          updated_at?: string
        }
        Update: {
          address?: string
          ambulance_count?: number
          available_beds?: number
          available_icu_beds?: number
          contact?: string
          created_at?: string
          emergency_capacity?: number
          hospital_code?: string
          hospital_name?: string
          icu_beds?: number
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          status?: string
          total_beds?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          notification_type: string
          read: boolean
          related_alert_id: string | null
          related_disaster_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          notification_type: string
          read?: boolean
          related_alert_id?: string | null
          related_disaster_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          notification_type?: string
          read?: boolean
          related_alert_id?: string | null
          related_disaster_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_alert_id_fkey"
            columns: ["related_alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_disaster_id_fkey"
            columns: ["related_disaster_id"]
            isOneToOne: false
            referencedRelation: "disasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          allocated_quantity: number
          available_quantity: number
          category: string
          condition: string
          created_at: string
          damaged_quantity: number
          expiry_date: string | null
          id: string
          minimum_stock: number
          name: string
          status: string
          storage_location: string
          supplier: string
          total_quantity: number
          unit: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          allocated_quantity?: number
          available_quantity: number
          category: string
          condition?: string
          created_at?: string
          damaged_quantity?: number
          expiry_date?: string | null
          id?: string
          minimum_stock?: number
          name: string
          status?: string
          storage_location?: string
          supplier?: string
          total_quantity: number
          unit?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          allocated_quantity?: number
          available_quantity?: number
          category?: string
          condition?: string
          created_at?: string
          damaged_quantity?: number
          expiry_date?: string | null
          id?: string
          minimum_stock?: number
          name?: string
          status?: string
          storage_location?: string
          supplier?: string
          total_quantity?: number
          unit?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      response_team_members: {
        Row: {
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "response_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      response_teams: {
        Row: {
          assigned_disaster_id: string | null
          availability: boolean
          created_at: string
          current_location: string
          id: string
          latitude: number | null
          leader_id: string | null
          longitude: number | null
          phone: string
          status: Database["public"]["Enums"]["team_status"]
          team_code: string
          team_name: string
          team_type: Database["public"]["Enums"]["team_type"]
          updated_at: string
        }
        Insert: {
          assigned_disaster_id?: string | null
          availability?: boolean
          created_at?: string
          current_location: string
          id?: string
          latitude?: number | null
          leader_id?: string | null
          longitude?: number | null
          phone: string
          status?: Database["public"]["Enums"]["team_status"]
          team_code?: string
          team_name: string
          team_type: Database["public"]["Enums"]["team_type"]
          updated_at?: string
        }
        Update: {
          assigned_disaster_id?: string | null
          availability?: boolean
          created_at?: string
          current_location?: string
          id?: string
          latitude?: number | null
          leader_id?: string | null
          longitude?: number | null
          phone?: string
          status?: Database["public"]["Enums"]["team_status"]
          team_code?: string
          team_name?: string
          team_type?: Database["public"]["Enums"]["team_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_teams_assigned_disaster_id_fkey"
            columns: ["assigned_disaster_id"]
            isOneToOne: false
            referencedRelation: "disasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shelters: {
        Row: {
          address: string
          available_capacity: number | null
          capacity: number
          city: string
          contact_number: string
          contact_person: string
          created_at: string
          current_occupancy: number
          district: string
          facilities: string[]
          id: string
          latitude: number
          longitude: number
          shelter_code: string
          shelter_name: string
          shelter_type: string
          state: string
          status: Database["public"]["Enums"]["shelter_status"]
          updated_at: string
        }
        Insert: {
          address: string
          available_capacity?: number | null
          capacity: number
          city: string
          contact_number: string
          contact_person: string
          created_at?: string
          current_occupancy?: number
          district: string
          facilities?: string[]
          id?: string
          latitude: number
          longitude: number
          shelter_code?: string
          shelter_name: string
          shelter_type: string
          state: string
          status?: Database["public"]["Enums"]["shelter_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          available_capacity?: number | null
          capacity?: number
          city?: string
          contact_number?: string
          contact_person?: string
          created_at?: string
          current_occupancy?: number
          district?: string
          facilities?: string[]
          id?: string
          latitude?: number
          longitude?: number
          shelter_code?: string
          shelter_name?: string
          shelter_type?: string
          state?: string
          status?: Database["public"]["Enums"]["shelter_status"]
          updated_at?: string
        }
        Relationships: []
      }
      training_activities: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          label: string
          sort_order: number
          training_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          training_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_activities_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_participants: {
        Row: {
          attendance: boolean
          certificate: string | null
          created_at: string
          id: string
          participant_code: string | null
          participant_name: string | null
          participant_role: string | null
          phone: string | null
          registration_date: string
          status: string
          training_id: string
          user_id: string
        }
        Insert: {
          attendance?: boolean
          certificate?: string | null
          created_at?: string
          id?: string
          participant_code?: string | null
          participant_name?: string | null
          participant_role?: string | null
          phone?: string | null
          registration_date?: string
          status?: string
          training_id: string
          user_id: string
        }
        Update: {
          attendance?: boolean
          certificate?: string | null
          created_at?: string
          id?: string
          participant_code?: string | null
          participant_name?: string | null
          participant_role?: string | null
          phone?: string | null
          registration_date?: string
          status?: string
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_participants_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          attendance_rate: number
          created_at: string
          created_by: string | null
          description: string
          disaster_type: string
          end_time: string | null
          id: string
          location: string
          name: string
          participant_count: number
          progress: number
          scheduled_at: string
          start_time: string | null
          status: Database["public"]["Enums"]["training_status"]
          trainer_id: string | null
          updated_at: string
        }
        Insert: {
          attendance_rate?: number
          created_at?: string
          created_by?: string | null
          description?: string
          disaster_type: string
          end_time?: string | null
          id?: string
          location: string
          name: string
          participant_count?: number
          progress?: number
          scheduled_at: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["training_status"]
          trainer_id?: string | null
          updated_at?: string
        }
        Update: {
          attendance_rate?: number
          created_at?: string
          created_by?: string | null
          description?: string
          disaster_type?: string
          end_time?: string | null
          id?: string
          location?: string
          name?: string
          participant_count?: number
          progress?: number
          scheduled_at?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["training_status"]
          trainer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          address: string
          capacity: number
          contact: string
          created_at: string
          current_utilization: number
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          manager: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          warehouse_code: string
          warehouse_name: string
        }
        Insert: {
          address: string
          capacity: number
          contact: string
          created_at?: string
          current_utilization?: number
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          manager: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          warehouse_code?: string
          warehouse_name: string
        }
        Update: {
          address?: string
          capacity?: number
          contact?: string
          created_at?: string
          current_utilization?: number
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          manager?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          warehouse_code?: string
          warehouse_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acknowledge_alert: {
        Args: { _alert_id: string }
        Returns: {
          acknowledged_at: string
          alert_id: string
          id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "alert_acknowledgements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      allocate_resource: {
        Args: {
          _quantity: number
          _resource_id: string
          _training_id: string
          _volunteer_id: string
        }
        Returns: Json
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "high" | "medium" | "info"
      alert_status: "active" | "resolved"
      alert_type:
        | "Disaster Warning"
        | "Resource Shortage"
        | "Evacuation"
        | "Medical Emergency"
        | "Weather"
        | "Training"
        | "Infrastructure"
        | "Security"
        | "Other"
      allocation_status: "allocated" | "returned"
      app_role: "admin" | "trainer" | "volunteer"
      attendance_status: "Present" | "Absent" | "Late"
      disaster_severity: "Low" | "Medium" | "High" | "Critical"
      disaster_status:
        | "Reported"
        | "Active"
        | "Under Response"
        | "Contained"
        | "Resolved"
        | "Closed"
      disaster_type:
        | "Flood"
        | "Fire"
        | "Earthquake"
        | "Cyclone"
        | "Landslide"
        | "Tsunami"
        | "Drought"
        | "Industrial Accident"
        | "Building Collapse"
        | "Other"
      evacuation_status: "Planned" | "In Progress" | "Completed" | "Cancelled"
      record_status: "active" | "inactive"
      shelter_status: "Open" | "Full" | "Closed" | "Emergency Only"
      team_status:
        | "Available"
        | "Assigned"
        | "Deployed"
        | "Unavailable"
        | "Completed"
      team_type:
        | "Search & Rescue"
        | "Medical"
        | "Fire & Rescue"
        | "Police"
        | "Volunteer"
        | "Logistics"
        | "Emergency Response"
      training_status: "planned" | "active" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_severity: ["high", "medium", "info"],
      alert_status: ["active", "resolved"],
      alert_type: [
        "Disaster Warning",
        "Resource Shortage",
        "Evacuation",
        "Medical Emergency",
        "Weather",
        "Training",
        "Infrastructure",
        "Security",
        "Other",
      ],
      allocation_status: ["allocated", "returned"],
      app_role: ["admin", "trainer", "volunteer"],
      attendance_status: ["Present", "Absent", "Late"],
      disaster_severity: ["Low", "Medium", "High", "Critical"],
      disaster_status: [
        "Reported",
        "Active",
        "Under Response",
        "Contained",
        "Resolved",
        "Closed",
      ],
      disaster_type: [
        "Flood",
        "Fire",
        "Earthquake",
        "Cyclone",
        "Landslide",
        "Tsunami",
        "Drought",
        "Industrial Accident",
        "Building Collapse",
        "Other",
      ],
      evacuation_status: ["Planned", "In Progress", "Completed", "Cancelled"],
      record_status: ["active", "inactive"],
      shelter_status: ["Open", "Full", "Closed", "Emergency Only"],
      team_status: [
        "Available",
        "Assigned",
        "Deployed",
        "Unavailable",
        "Completed",
      ],
      team_type: [
        "Search & Rescue",
        "Medical",
        "Fire & Rescue",
        "Police",
        "Volunteer",
        "Logistics",
        "Emergency Response",
      ],
      training_status: ["planned", "active", "completed", "cancelled"],
    },
  },
} as const
