import React from 'react';
import { Formik, Form as FormikForm } from 'formik';
import * as Yup from 'yup';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';
import Button from './Button';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
  helperText?: string;
}

interface FormProps {
  fields: FormField[];
  initialValues: Record<string, any>;
  validationSchema: Yup.ObjectSchema<any>;
  onSubmit: (values: any) => Promise<void>;
  submitButtonText?: string;
  isSubmitting?: boolean;
  error?: string;
}

const Form: React.FC<FormProps> = ({
  fields,
  initialValues,
  validationSchema,
  onSubmit,
  submitButtonText = 'Submit',
  isSubmitting = false,
  error
}) => {
  const renderField = (field: FormField, formikProps: any) => {
    const error = formikProps.touched[field.name] && formikProps.errors[field.name];

    switch (field.type) {
      case 'select':
        return (
          <Select
            id={field.name}
            name={field.name}
            label={field.label}
            value={formikProps.values[field.name]}
            onChange={(value) => formikProps.setFieldValue(field.name, value)}
            onBlur={() => formikProps.setFieldTouched(field.name, true)}
            error={error}
            helperText={field.helperText}
            options={field.options || []}
            fullWidth
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            id={field.name}
            name={field.name}
            label={field.label}
            value={formikProps.values[field.name]}
            onChange={formikProps.handleChange}
            onBlur={formikProps.handleBlur}
            error={error}
            helperText={field.helperText}
            placeholder={field.placeholder}
            fullWidth
          />
        );
      
      default:
        return (
          <Input
            id={field.name}
            name={field.name}
            type={field.type}
            label={field.label}
            value={formikProps.values[field.name]}
            onChange={formikProps.handleChange}
            onBlur={formikProps.handleBlur}
            error={error}
            helperText={field.helperText}
            placeholder={field.placeholder}
            fullWidth
          />
        );
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {(formikProps) => (
        <form className="space-y-6">
          {fields.map((field) => (
            <div key={field.name}>
              {renderField(field, formikProps)}
            </div>
          ))}

          {error && (
            <div className="text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !formikProps.isValid}
              isLoading={isSubmitting}
            >
              {submitButtonText}
            </Button>
          </div>
        </form>
      )}
    </Formik>
  );
};

export default Form; 